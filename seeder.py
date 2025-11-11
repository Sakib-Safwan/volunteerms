import sqlite3
import bcrypt
import random
from faker import Faker
import os
from datetime import datetime, timedelta # NEW: Import datetime

# --- Configuration ---
NUM_VOLUNTEERS = 50
NUM_ORGANIZERS = 5
NUM_EVENTS = 20
DB_PATH = os.path.join('backend', 'vms.db') # Assumes script is in the root folder
DEFAULT_PASSWORD = "pass123"

# Pre-defined skills list (from your idea)
SKILL_LIST = [
    "First Aid", "Graphic Design", "Public Speaking", "Data Entry",
    "Event Planning", "Fundraising", "Social Media", "Driving",
    "Cooking", "Teaching", "Manual Labor", "Photography"
]

# --- Setup ---
fake = Faker()
db = None

def hash_password(password):
    """Hashes a password using bcrypt, compatible with Go's DefaultCost."""
    # Go's DefaultCost is 10.
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_users(cursor):
    """Creates a batch of volunteers and organizers."""
    print(f"Creating {NUM_VOLUNTEERS} volunteers and {NUM_ORGANIZERS} organizers...")
    users = []
    
    # Create Volunteers
    for _ in range(NUM_VOLUNTEERS):
        email = fake.unique.email()
        hashed_pass = hash_password(DEFAULT_PASSWORD)
        users.append((email, hashed_pass, "Volunteer"))

    # Create Organizers
    for _ in range(NUM_ORGANIZERS):
        email = fake.unique.email()
        hashed_pass = hash_password(DEFAULT_PASSWORD)
        users.append((email, hashed_pass, "Organizer"))
    
    try:
        cursor.executemany(
            "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
            users
        )
        print("Users created successfully.")
    except Exception as e:
        print(f"Error creating users: {e}")

def create_events(cursor):
    """Creates random events assigned to organizers."""
    print(f"Creating {NUM_EVENTS} events...")
    
    # Get all organizer IDs
    cursor.execute("SELECT id FROM users WHERE role = 'Organizer'")
    organizer_ids = [row[0] for row in cursor.fetchall()]
    
    if not organizer_ids:
        print("No organizers found to create events. Aborting.")
        return

    # --- FIXED: Use explicit datetime objects ---
    now = datetime.now()
    start_date = now + timedelta(weeks=1)
    end_date = now + timedelta(days=180) # 6 months from now

    events = []
    for _ in range(NUM_EVENTS):
        name = fake.bs().title() + " Drive" # e.g., "Implement User-Centric Solutions Drive"
        
        # Use the fixed datetime objects
        event_date_obj = fake.date_between_dates(date_start=start_date, date_end=end_date)
        date = event_date_obj.isoformat()

        description = fake.text(max_nb_chars=150)
        location = fake.address().replace('\n', ', ')
        image_url = f"https://placehold.co/600x200/1D9BF0/FFFFFF?text={name.replace(' ', '+')}"
        organizer_id = random.choice(organizer_ids)
        
        events.append((name, date, description, location, image_url, organizer_id))

    try:
        cursor.executemany(
            """INSERT INTO events (name, date, description, location_address, image_url, created_by_user_id)
               VALUES (?, ?, ?, ?, ?, ?)""",
            events
        )
        print("Events created successfully.")
    except Exception as e:
        print(f"Error creating events: {e}")

def create_registrations(cursor):
    """Randomly registers volunteers for events."""
    print("Creating random event registrations...")
    
    cursor.execute("SELECT id FROM users WHERE role = 'Volunteer'")
    volunteer_ids = [row[0] for row in cursor.fetchall()]
    
    cursor.execute("SELECT id FROM events")
    event_ids = [row[0] for row in cursor.fetchall()]
    
    if not volunteer_ids or not event_ids:
        print("No volunteers or events to create registrations.")
        return

    registrations = []
    # Each volunteer registers for 0 to 3 events
    for vol_id in volunteer_ids:
        num_events = random.randint(0, 3)
        events_to_register = random.sample(event_ids, num_events)
        for event_id in events_to_register:
            # Use tuple (user_id, event_id) to ensure uniqueness
            registrations.append((vol_id, event_id))

    try:
        # INSERT OR IGNORE avoids duplicates
        cursor.executemany(
            "INSERT OR IGNORE INTO registrations (user_id, event_id) VALUES (?, ?)",
            registrations
        )
        print("Registrations created successfully.")
    except Exception as e:
        print(f"Error creating registrations: {e}")

def create_friendships(cursor):
    """Randomly creates mutual friendships between volunteers."""
    print("Creating random friendships...")
    
    cursor.execute("SELECT id FROM users WHERE role = 'Volunteer'")
    v_ids = [row[0] for row in cursor.fetchall()]
    
    if len(v_ids) < 2:
        print("Not enough volunteers to create friendships.")
        return

    friendships = []
    # Each volunteer becomes friends with 0 to 5 other volunteers
    for user_id_a in v_ids:
        num_friends = random.randint(0, 5)
        # Find 5 potential friends who are not the user
        potential_friends = [uid for uid in v_ids if uid != user_id_a]
        new_friends = random.sample(potential_friends, min(num_friends, len(potential_friends)))
        
        for user_id_b in new_friends:
            # Add both directions
            friendships.append((user_id_a, user_id_b))
            friendships.append((user_id_b, user_id_a))

    try:
        # INSERT OR IGNORE avoids duplicates
        cursor.executemany(
            "INSERT OR IGNORE INTO friendships (user_id_a, user_id_b) VALUES (?, ?)",
            friendships
        )
        print("Friendships created successfully.")
    except Exception as e:
        print(f"Error creating friendships: {e}")

def create_skills(cursor):
    """Assigns random skills to volunteers."""
    print("Assigning skills to volunteers...")
    
    cursor.execute("SELECT id FROM users WHERE role = 'Volunteer'")
    volunteer_ids = [row[0] for row in cursor.fetchall()]
    
    if not volunteer_ids:
        print("No volunteers found to assign skills.")
        return

    skills_data = []
    # Each volunteer gets 1 to 4 random skills
    for vol_id in volunteer_ids:
        num_skills = random.randint(1, 4)
        my_skills = random.sample(SKILL_LIST, num_skills)
        for skill in my_skills:
            skills_data.append((vol_id, skill))
    
    try:
        cursor.executemany(
            "INSERT OR IGNORE INTO user_skills (user_id, skill) VALUES (?, ?)",
            skills_data
        )
        print("Skills assigned successfully.")
    except Exception as e:
        print(f"Error assigning skills: {e}")

def main():
    print(f"Connecting to database at {DB_PATH}...")
    try:
        db = sqlite3.connect(DB_PATH)
        cursor = db.cursor()
        
        # Clear existing data from tables in the correct order
        print("Clearing old data...")
        cursor.execute("DELETE FROM user_skills")
        cursor.execute("DELETE FROM friendships")
        cursor.execute("DELETE FROM registrations")
        cursor.execute("DELETE FROM events")
        cursor.execute("DELETE FROM users")
        
        # Reset auto-increment counters
        cursor.execute("DELETE FROM sqlite_sequence")
        
        # Run seeding functions
        create_users(cursor)
        create_events(cursor)
        create_registrations(cursor)
        create_friendships(cursor)
        create_skills(cursor)

        # Commit changes and close
        db.commit()
        print("\nDatabase successfully seeded with random data!")
        
    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
        if db:
            db.rollback()
    finally:
        if db:
            db.close()
            print("Database connection closed.")

if __name__ == "__main__":
    main()