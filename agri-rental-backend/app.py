from flask import Flask, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from functools import wraps
from flask_cors import CORS

# --- App and DB Configuration ---
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-very-secret-key' 
CORS(app)

try:
    client = MongoClient('mongodb://localhost:27017/')
    db = client.agri_rental 
    users_collection = db.users
    vehicles_collection = db.vehicles
    bookings_collection = db.bookings
    print("MongoDB connected successfully!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")

def to_json(data):
    if isinstance(data, list):
        return [to_json(item) for item in data]
    
    if isinstance(data, dict):
        result = {}
        if '$oid' in data and len(data) == 1:
            try:
                return str(ObjectId(data['$oid']))
            except Exception:
                # If it's not a valid ObjectId string, just return the dict as is
                return data['$oid']

        for key, value in data.items():
            if isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime.datetime):
                result[key] = value.isoformat() # Convert datetime objects
            elif isinstance(value, dict):
                result[key] = to_json(value) # Recursively call for nested dictionaries
            elif isinstance(value, list):
                result[key] = to_json(value) # Recursively call for nested lists
            else:
                result[key] = value
        return result
    return data

# --- Authentication Decorators ---
def token_required(f):
    """
    Decorator to protect routes with JWT.
    Handles both regular access tokens and temporary 'set-role' tokens.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'x-access-token' in request.headers:
            token = request.headers['x-access-token']
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            # Ensure user_id from token is always an ObjectId for DB query
            user_id_obj = ObjectId(data['user_id'])
            current_user_doc = users_collection.find_one({'_id': user_id_obj})
            
            if not current_user_doc:
                return jsonify({'message': 'User not found!'}), 401
            
            # Convert the fetched user document to JSON-safe format immediately
            current_user = to_json(current_user_doc) 

            # If the endpoint is for setting a role, check the token's purpose
            if request.path.endswith('/role') and request.method == 'PUT':
                if data.get('purpose') != 'set-role':
                    if current_user.get('role'):
                        return jsonify({'message': 'Invalid token for setting role or role already set!'}), 401
            
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except Exception as e:
            return jsonify({'message': 'Token is invalid!', 'error': str(e)}), 401
        
        return f(current_user, *args, **kwargs) # Pass the JSON-safe current_user
    return decorated

def role_required(role):
    """Decorator for role-based access control."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            current_user = args[0] # Assumes token_required is used before this, and current_user is JSON-safe dict
            if current_user.get('role') != role:
                return jsonify({'message': f'Requires {role} role!'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# --- User Authentication Routes ---

@app.route('/register', methods=['POST'])
def register():
    """User registration route."""
    data = request.get_json()
    if not all(k in data for k in ['username', 'password', 'fullname', 'phone', 'address']):
        return jsonify({'message': 'Missing required fields!'}), 400

    if users_collection.find_one({'username': data['username']}):
        return jsonify({'message': 'Username already exists!'}), 409

    hashed_password = generate_password_hash(data['password'])
    
    new_user = {
        'username': data['username'],
        'fullname': data['fullname'],
        'phone': data['phone'],
        'address': data['address'],
        'password': hashed_password,
        'role': None, # Role is set after signup
        'created_at': datetime.datetime.utcnow()
    }
    result = users_collection.insert_one(new_user)

    # After creating the user, issue a temporary token for role selection
    inserted_id = result.inserted_id
    temp_token = jwt.encode({
        'user_id': str(inserted_id), # Store as string in token
        'purpose': 'set-role', # Indicate this token is for role setting
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    }, app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({
        'message': 'User registered successfully! Please select a role using the provided token.', 
        'temp_token': temp_token, 
        'username': data['username']
    }), 201

@app.route('/login', methods=['POST'])
def login():
    """User login route."""
    auth = request.get_json()
    if not auth or not auth.get('username') or not auth.get('password'):
        return jsonify({'message': 'Could not verify'}), 401

    user = users_collection.find_one({'username': auth['username']})
    if not user:
        return jsonify({'message': 'User not found!'}), 401

    if check_password_hash(user['password'], auth['password']):
        if not user.get('role'):
            # User has no role, issue a temporary token for role selection
            temp_token = jwt.encode({
                'user_id': str(user['_id']), # Store as string in token
                'purpose': 'set-role',
                'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
            }, app.config['SECRET_KEY'], algorithm="HS256")
            
            return jsonify({
                'message': 'Please select a role before logging in.', 
                'role_needed': True, 
                'username': user['username'], 
                'temp_token': temp_token
            }), 403
        else:
            # User has a role, issue a regular token
            token = jwt.encode({
                'user_id': str(user['_id']), # Store as string in token
                'role': user['role'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, app.config['SECRET_KEY'], algorithm="HS256")
            return jsonify({'token': token, 'role': user['role'], 'message': 'Logged in successfully'})

    return jsonify({'message': 'Invalid password!'}), 401

@app.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    """Get user profile information."""
    # current_user is already converted to JSON-safe dict by token_required
    current_user.pop('password', None) # Remove password, as it's not needed by the client
    return jsonify(current_user)

@app.route('/users/<username>/role', methods=['PUT'])
@token_required
def set_user_role(current_user, username):
    """Set user role after signup or login."""
    # current_user is already converted to JSON-safe dict by token_required
    if current_user['username'] != username:
        return jsonify({'message': 'You can only update your own role!'}), 403
    
    # Prevent users from changing their role once it's set
    if current_user.get('role'):
        return jsonify({'message': 'Role has already been set and cannot be changed.'}), 400

    data = request.get_json()
    role = data.get('role')
    if role not in ['owner', 'renter']:
        return jsonify({'message': 'Invalid role specified! Must be "owner" or "renter".'}), 400
    
    # Update the role in the database using the original ObjectId (which is now string in current_user)
    users_collection.update_one({'_id': ObjectId(current_user['_id'])}, {'$set': {'role': role}})
    
    # After setting the role, issue a standard access token to complete the login cycle
    token = jwt.encode({
        'user_id': current_user['_id'], # current_user['_id'] is already a string here
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({
        'message': f'Role updated to {role} successfully! You are now logged in.',
        'token': token,
        'role': role
    })

# --- Vehicle Routes (CRUD) ---

@app.route('/vehicles', methods=['POST'])
@token_required
@role_required('owner')
def add_vehicle(current_user):
    """Add a new vehicle (owner only)."""
    # current_user is already converted to JSON-safe dict by token_required
    data = request.get_json()
    # Basic validation
    required_fields = ['vehicle_name', 'model', 'type', 'rent_price', 'location']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Missing required vehicle fields!'}), 400

    try:
        rent_price = float(data['rent_price'])
    except ValueError:
        return jsonify({'message': 'Rent price must be a valid number'}), 400

    new_vehicle = {
        'owner_id': ObjectId(current_user['_id']), # Convert back to ObjectId for DB storage
        'vehicle_name': data['vehicle_name'],
        'model': data['model'],
        'type': data['type'],
        'rent_price': rent_price,
        'availability': data.get('availability', True), # Default to True
        'image1_url': data.get('image1_url', ''),
        'image2_url': data.get('image2_url', ''),
        'location': data['location'], # Expects an object like {lat: float, lng: float}
        'created_at': datetime.datetime.utcnow()
    }
    vehicles_collection.insert_one(new_vehicle)
    return jsonify({'message': 'Vehicle added successfully!'}), 201

@app.route('/vehicles', methods=['GET'])
@token_required
def get_all_vehicles(current_user):
    """Get all vehicles. Owners see their own, renters see all available."""
    # current_user is already converted to JSON-safe dict by token_required
    if current_user['role'] == 'owner':
        vehicles = vehicles_collection.find({'owner_id': ObjectId(current_user['_id'])})
    else: # Renter
        vehicles = vehicles_collection.find({'availability': True})
    
    return jsonify(to_json(list(vehicles)))

@app.route('/vehicles/<vehicle_id>', methods=['GET'])
@token_required
def get_vehicle(current_user, vehicle_id):
    """Get a single vehicle by its ID."""
    # current_user is already converted to JSON-safe dict by token_required
    try:
        obj_id = ObjectId(vehicle_id)
    except Exception:
        return jsonify({'message': 'Invalid vehicle ID format'}), 400
        
    vehicle = vehicles_collection.find_one({'_id': obj_id})
    if not vehicle:
        return jsonify({'message': 'Vehicle not found'}), 404

    # Authorization check for owner: ensure owner can only see their own vehicles
    # Renters can see any vehicle that is available.
    if current_user['role'] == 'owner' and vehicle['owner_id'] != ObjectId(current_user['_id']):
        return jsonify({'message': 'Unauthorized to view this vehicle'}), 403
    
    return jsonify(to_json(vehicle))

@app.route('/vehicles/<vehicle_id>', methods=['PUT'])
@token_required
@role_required('owner')
def update_vehicle(current_user, vehicle_id):
    """Update a vehicle's details (owner only)."""
    # current_user is already converted to JSON-safe dict by token_required
    try:
        obj_id = ObjectId(vehicle_id)
    except Exception:
        return jsonify({'message': 'Invalid vehicle ID format'}), 400

    vehicle = vehicles_collection.find_one({'_id': obj_id})
    if not vehicle:
        return jsonify({'message': 'Vehicle not found'}), 404
    if vehicle['owner_id'] != ObjectId(current_user['_id']):
        return jsonify({'message': 'Unauthorized to update this vehicle'}), 403

    data = request.get_json()
    update_data = {k: v for k, v in data.items() if k in ['vehicle_name', 'model', 'type', 'rent_price', 'availability', 'image1_url', 'image2_url', 'location']}
    
    if 'rent_price' in update_data:
        try:
            update_data['rent_price'] = float(update_data['rent_price'])
        except ValueError:
            return jsonify({'message': 'Rent price must be a valid number'}), 400

    if update_data:
        vehicles_collection.update_one({'_id': obj_id}, {'$set': update_data})
    
    return jsonify({'message': 'Vehicle updated successfully'})

@app.route('/vehicles/<vehicle_id>', methods=['DELETE'])
@token_required
@role_required('owner')
def delete_vehicle(current_user, vehicle_id):
    """Delete a vehicle (owner only)."""
    # current_user is already converted to JSON-safe dict by token_required
    try:
        obj_id = ObjectId(vehicle_id)
    except Exception:
        return jsonify({'message': 'Invalid vehicle ID format'}), 400

    vehicle = vehicles_collection.find_one({'_id': obj_id})
    if not vehicle:
        return jsonify({'message': 'Vehicle not found'}), 404
    if vehicle['owner_id'] != ObjectId(current_user['_id']):
        return jsonify({'message': 'Unauthorized to delete this vehicle'}), 403

    # Before deleting, check if there are any pending or confirmed bookings
    # for this vehicle. If so, prevent deletion or handle gracefully.
    active_bookings_count = bookings_collection.count_documents({
        'vehicle_id': obj_id,
        'status': {'$in': ['pending', 'confirmed']}
    })
    if active_bookings_count > 0:
        return jsonify({
            'message': 'Cannot delete vehicle with active bookings. Please cancel bookings first.'
        }), 400

    vehicles_collection.delete_one({'_id': obj_id})
    return jsonify({'message': 'Vehicle deleted successfully'})

# --- Booking Routes (CRUD) ---

@app.route('/bookings', methods=['POST'])
@token_required
@role_required('renter')
def create_booking(current_user):
    """Create a new booking (renter only)."""
    # current_user is already converted to JSON-safe dict by token_required
    data = request.get_json()
    if not all(k in data for k in ['vehicle_id', 'start_time', 'end_time']):
        return jsonify({'message': 'Missing booking data'}), 400

    try:
        vehicle_obj_id = ObjectId(data['vehicle_id'])
    except Exception:
        return jsonify({'message': 'Invalid vehicle ID format'}), 400

    vehicle = vehicles_collection.find_one({'_id': vehicle_obj_id})
    if not vehicle:
        return jsonify({'message': 'Vehicle not found'}), 404
    
    if not vehicle.get('availability', True):
        return jsonify({'message': 'Vehicle not available for booking'}), 400
    
    if vehicle['owner_id'] == ObjectId(current_user['_id']):
        return jsonify({'message': 'You cannot book your own vehicle!'}), 400

    # Basic time validation (can be expanded with more robust checks)
    try:
        start_time = datetime.datetime.fromisoformat(data['start_time'])
        end_time = datetime.datetime.fromisoformat(data['end_time'])
        if start_time >= end_time:
            return jsonify({'message': 'Start time must be before end time'}), 400
        if start_time < datetime.datetime.utcnow():
            return jsonify({'message': 'Cannot book in the past'}), 400
    except ValueError:
        return jsonify({'message': 'Invalid date/time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'}), 400

    # Check for overlapping bookings for the same vehicle
    overlapping_bookings = bookings_collection.count_documents({
        'vehicle_id': vehicle_obj_id,
        'status': {'$in': ['pending', 'confirmed']},
        '$or': [
            {'start_time': {'$lt': end_time}, 'end_time': {'$gt': start_time}}
        ]
    })
    if overlapping_bookings > 0:
        return jsonify({'message': 'Vehicle is already booked during this period.'}), 409


    new_booking = {
        'renter_id': ObjectId(current_user['_id']), # Convert back to ObjectId for DB storage
        'vehicle_id': vehicle_obj_id,
        'start_time': start_time,
        'end_time': end_time,
        'status': 'pending', # Statuses: pending, confirmed, cancelled, completed
        'created_at': datetime.datetime.utcnow()
    }
    bookings_collection.insert_one(new_booking)
    return jsonify({'message': 'Booking request sent successfully! Waiting for owner confirmation.'}), 201

@app.route('/bookings', methods=['GET'])
@token_required
def get_bookings(current_user):
    """Get bookings. Renters see their own, owners see bookings for their vehicles."""
    # current_user is already converted to JSON-safe dict by token_required
    if current_user['role'] == 'renter':
        pipeline = [
            {'$match': {'renter_id': ObjectId(current_user['_id'])}}, # Match using ObjectId
            {'$lookup': {
                'from': 'vehicles',
                'localField': 'vehicle_id',
                'foreignField': '_id',
                'as': 'vehicle_details'
            }},
            {'$unwind': '$vehicle_details'},
            {'$project': {'vehicle_details.owner_id': 0}} # Exclude owner_id from vehicle_details
        ]
        bookings = list(bookings_collection.aggregate(pipeline))
    else: # Owner
        owner_vehicles = list(vehicles_collection.find({'owner_id': ObjectId(current_user['_id'])}, {'_id': 1}))
        owner_vehicle_ids = [v['_id'] for v in owner_vehicles]
        
        if not owner_vehicle_ids:
            return jsonify(to_json([])), 200 # Owner has no vehicles, thus no bookings for them

        pipeline = [
            {'$match': {'vehicle_id': {'$in': owner_vehicle_ids}}},
            {'$lookup': {
                'from': 'users',
                'localField': 'renter_id',
                'foreignField': '_id',
                'as': 'renter_details'
            }},
            {'$unwind': '$renter_details'},
            {'$lookup': {
                'from': 'vehicles',
                'localField': 'vehicle_id',
                'foreignField': '_id',
                'as': 'vehicle_details'
            }},
            {'$unwind': '$vehicle_details'},
            {'$project': {
                'renter_details.password': 0, # Exclude renter's password
                'vehicle_details.owner_id': 0 # Exclude owner_id from vehicle_details
            }} 
        ]
        bookings = list(bookings_collection.aggregate(pipeline))

    return jsonify(to_json(bookings))

@app.route('/bookings/<booking_id>', methods=['PUT'])
@token_required
def update_booking_status(current_user, booking_id):
    """Update booking status. Owner can confirm/cancel, renter can cancel."""
    # current_user is already converted to JSON-safe dict by token_required
    try:
        booking_obj_id = ObjectId(booking_id)
    except Exception:
        return jsonify({'message': 'Invalid booking ID format'}), 400

    booking = bookings_collection.find_one({'_id': booking_obj_id})
    if not booking:
        return jsonify({'message': 'Booking not found'}), 404

    data = request.get_json()
    new_status = data.get('status')
    if not new_status or new_status not in ['confirmed', 'cancelled', 'completed']:
        return jsonify({'message': 'Invalid status. Must be "confirmed", "cancelled", or "completed".'}), 400

    if current_user['role'] == 'owner':
        vehicle = vehicles_collection.find_one({'_id': booking['vehicle_id']})
        if not vehicle or vehicle['owner_id'] != ObjectId(current_user['_id']):
            return jsonify({'message': 'Unauthorized: Not the owner of this vehicle'}), 403
        
        # Owner can set confirmed, cancelled, completed
        if new_status == 'confirmed':
            # Check for availability if confirming (prevent double booking in a small race condition)
            if not vehicle.get('availability', True):
                 return jsonify({'message': 'Vehicle is no longer available to confirm this booking.'}), 400
            
            bookings_collection.update_one({'_id': booking_obj_id}, {'$set': {'status': 'confirmed'}})
            vehicles_collection.update_one({'_id': booking['vehicle_id']}, {'$set': {'availability': False}}) # Make vehicle unavailable
            return jsonify({'message': 'Booking confirmed successfully!'})
        
        elif new_status == 'cancelled':
            bookings_collection.update_one({'_id': booking_obj_id}, {'$set': {'status': 'cancelled'}})
            # If the booking was previously confirmed, make the vehicle available again
            if booking['status'] == 'confirmed':
                vehicles_collection.update_one({'_id': booking['vehicle_id']}, {'$set': {'availability': True}})
            return jsonify({'message': 'Booking cancelled by owner.'})
        
        elif new_status == 'completed':
            if booking['status'] != 'confirmed':
                return jsonify({'message': 'Only confirmed bookings can be marked as completed.'}), 400
            bookings_collection.update_one({'_id': booking_obj_id}, {'$set': {'status': 'completed'}})
            vehicles_collection.update_one({'_id': booking['vehicle_id']}, {'$set': {'availability': True}}) # Make vehicle available again after completion
            return jsonify({'message': 'Booking marked as completed.'})

    elif current_user['role'] == 'renter':
        if booking['renter_id'] != ObjectId(current_user['_id']):
            return jsonify({'message': 'Unauthorized: Not your booking'}), 403
        
        # Renters can only cancel their own pending/confirmed bookings
        if new_status == 'cancelled':
            if booking['status'] in ['pending', 'confirmed']:
                bookings_collection.update_one({'_id': booking_obj_id}, {'$set': {'status': 'cancelled'}})
                # If the booking was confirmed, make the vehicle available again
                if booking['status'] == 'confirmed':
                    vehicles_collection.update_one({'_id': booking['vehicle_id']}, {'$set': {'availability': True}})
                return jsonify({'message': 'Booking cancelled by renter.'})
            else:
                return jsonify({'message': 'Cannot cancel a booking that is already cancelled or completed.'}), 400
        else:
            return jsonify({'message': 'Renters can only cancel bookings.'}), 403

    return jsonify({'message': 'Unauthorized action or invalid request.'}), 403

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)