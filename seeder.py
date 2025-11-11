import sqlite3
import bcrypt
import random
from faker import Faker
import os
import datetime
from datetime import timedelta

# --- Configuration ---
NUM_VOLUNTEERS = 50 # We will create 48 random + 2 custom
NUM_ORGANIZERS = 5
NUM_EVENTS = 20
NUM_GROUPS = 10
NUM_INVITATIONS = 30
DB_PATH = os.path.join('backend', 'vms.db')
DEFAULT_PASSWORD = "pass123"

# Pre-defined skills list
SKILL_LIST = [
    "First Aid", "Graphic Design", "Public Speaking", "Data Entry",
    "Event Planning", "Fundraising", "Social Media", "Driving",
    "Cooking", "Teaching", "Manual Labor", "Photography"
]

# --- Setup ---
fake = Faker()
db = None
all_user_ids = []
organizer_ids = []
volunteer_ids = []
group_ids = []

def hash_password(password):
    """Hashes a password using bcrypt, compatible with Go's DefaultCost."""
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_users(cursor):
    """Creates a batch of volunteers and organizers."""
    global all_user_ids, organizer_ids, volunteer_ids
    print(f"Creating {NUM_VOLUNTEERS} volunteers and {NUM_ORGANIZERS} organizers...")
    users = []
    
    # --- Create Custom Users ---
    custom_users = [
        ("Volunteer 1", "vol1@vol.com", hash_password("1234"), "Volunteer", "https://placehold.co/100x100/E8F5FF/1D9BF0?text=V"),
        ("Volunteer 2", "vol2@vol.com", hash_password("1234"), "Volunteer", "https://placehold.co/100x100/E8F5FF/1D9BF0?text=V"),
    ]
    users.extend(custom_users)
    print("Added 2 custom volunteers: vol1@vol.com and vol2@vol.com")

    # Create Random Volunteers
    for _ in range(NUM_VOLUNTEERS - 2): # Subtract the 2 we just added
        full_name = fake.name()
        email = fake.unique.email()
        hashed_pass = hash_password(DEFAULT_PASSWORD)
        pfp_url = f"https://placehold.co/100x100/E8F5FF/1D9BF0?text={full_name[0]}"
        users.append((full_name, email, hashed_pass, "Volunteer", pfp_url))

    # Create Organizers
    for _ in range(NUM_ORGANIZERS):
        full_name = fake.name()
        email = fake.unique.email()
        hashed_pass = hash_password(DEFAULT_PASSWORD)
        pfp_url = f"https://placehold.co/100x100/E8F5FF/1D9BF0?text={full_name[0]}"
        users.append((full_name, email, hashed_pass, "Organizer", pfp_url))
    
    try:
        cursor.executemany(
            "INSERT INTO users (name, email, password_hash, role, profile_image_url) VALUES (?, ?, ?, ?, ?)",
            users
        )
        # Get all user IDs
        cursor.execute("SELECT id, role FROM users")
        for row in cursor.fetchall():
            all_user_ids.append(row[0])
            if row[1] == 'Volunteer':
                volunteer_ids.append(row[0])
            else:
                organizer_ids.append(row[0])
        
        print("Users created successfully.")
    except Exception as e:
        print(f"Error creating users: {e}")

def create_events(cursor):
    """Creates random events assigned to organizers."""
    print(f"Creating {NUM_EVENTS} events...")
    if not organizer_ids:
        print("No organizers found to create events. Aborting.")
        return

    now = datetime.datetime.now()
    start_date = now + timedelta(weeks=1)
    end_date = now + timedelta(days=180)

    events = []
    for _ in range(NUM_EVENTS):
        name = fake.bs().title() + " Drive"
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
    cursor.execute("SELECT id FROM events")
    event_ids = [row[0] for row in cursor.fetchall()]
    
    if not volunteer_ids or not event_ids:
        print("No volunteers or events to create registrations.")
        return

    registrations = []
    for vol_id in volunteer_ids:
        num_events = random.randint(0, 3)
        events_to_register = random.sample(event_ids, num_events)
        for event_id in events_to_register:
            registrations.append((vol_id, event_id))
    try:
        cursor.executemany("INSERT OR IGNORE INTO registrations (user_id, event_id) VALUES (?, ?)", registrations)
        print("Registrations created successfully.")
    except Exception as e:
        print(f"Error creating registrations: {e}")

def create_follows(cursor):
    """Randomly creates one-way follows."""
    print("Creating random follows...")
    if len(all_user_ids) < 2:
        print("Not enough users to create follows.")
        return

    follows = []
    
    # --- Add Custom Follows ---
    try:
        cursor.execute("SELECT id FROM users WHERE email = 'vol1@vol.com'")
        vol1_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM users WHERE email = 'vol2@vol.com'")
        vol2_id = cursor.fetchone()[0]
        
        follows.append((vol1_id, vol2_id))
        follows.append((vol2_id, vol1_id))
        print("Added custom follows between vol1 and vol2.")
    except Exception as e:
        print(f"Could not add custom follows: {e}")
        
    # --- Add Random Follows ---
    for user_id_a in all_user_ids:
        num_follows = random.randint(0, 10)
        potential_follows = [uid for uid in all_user_ids if uid != user_id_a]
        new_follows = random.sample(potential_follows, min(num_follows, len(potential_follows)))
        for user_id_b in new_follows:
            follows.append((user_id_a, user_id_b))
    try:
        cursor.executemany("INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)", follows)
        print("Follows created successfully.")
    except Exception as e:
        print(f"Error creating follows: {e}")

def create_skills(cursor):
    """Assigns random skills to volunteers."""
    print("Assigning skills to volunteers...")
    if not volunteer_ids:
        print("No volunteers found to assign skills.")
        return

    skills_data = []
    for vol_id in volunteer_ids:
        num_skills = random.randint(1, 4)
        my_skills = random.sample(SKILL_LIST, num_skills)
        for skill in my_skills:
            skills_data.append((vol_id, skill))
    try:
        cursor.executemany("INSERT OR IGNORE INTO user_skills (user_id, skill) VALUES (?, ?)", skills_data)
        print("Skills assigned successfully.")
    except Exception as e:
        print(f"Error assigning skills: {e}")

def create_groups(cursor):
    """Creates random groups and adds members."""
    global group_ids
    print(f"Creating {NUM_GROUPS} groups...")
    if not all_user_ids:
        print("No users to create groups.")
        return
        
    groups = []
    for _ in range(NUM_GROUPS):
        name = fake.company() + " Volunteers"
        description = fake.text(max_nb_chars=100)
        creator_id = random.choice(all_user_ids)
        pfp_url = f"https://placehold.co/100x100/7E57C2/FFFFFF?text={name[0]}"
        groups.append((name, description, pfp_url, creator_id))
        
    try:
        cursor.executemany(
            "INSERT INTO groups (name, description, profile_image_url, created_by_user_id) VALUES (?, ?, ?, ?)",
            groups
        )
        print("Groups created successfully.")
    except Exception as e:
        print(f"Error creating groups: {e}")

    # Add members
    print("Adding members to groups...")
    cursor.execute("SELECT id FROM groups")
    group_ids = [row[0] for row in cursor.fetchall()]
    
    group_memberships = []
    # First, add all creators as admins
    cursor.execute("SELECT id, created_by_user_id FROM groups")
    for row in cursor.fetchall():
        group_memberships.append((row[0], row[1], "admin"))
        
    # Then, add random members
    for group_id in group_ids:
        num_members = random.randint(2, 15)
        members = random.sample(all_user_ids, num_members)
        for user_id in members:
            group_memberships.append((group_id, user_id, "member"))
            
    try:
        cursor.executemany(
            "INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)",
            group_memberships
        )
        print("Group members added successfully.")
    except Exception as e:
        print(f"Error adding group members: {e}")

def create_invitations(cursor):
    """Creates random pending group invitations."""
    print(f"Creating {NUM_INVITATIONS} group invitations...")
    if not all_user_ids or not group_ids:
        print("No users or groups to create invitations.")
        return

    invitations = []
    for _ in range(NUM_INVITATIONS):
        sender_id = random.choice(all_user_ids)
        receiver_id = random.choice(all_user_ids)
        group_id = random.choice(group_ids)
        
        # Ensure sender/receiver are different
        if sender_id == receiver_id:
            continue
            
        invitations.append((sender_id, receiver_id, 'group', group_id, 'pending'))

    try:
        # INSERT OR IGNORE to avoid duplicates
        cursor.executemany(
            "INSERT OR IGNORE INTO invitations (sender_id, receiver_id, invite_type, reference_id, status) VALUES (?, ?, ?, ?, ?)",
            invitations
        )
        print("Invitations created successfully.")
    except Exception as e:
        print(f"Error creating invitations: {e}")


def main():
    print(f"Connecting to database at {DB_PATH}...")
    try:
        db = sqlite3.connect(DB_PATH)
        cursor = db.cursor()
        
        print("Clearing old data...")
        # Clear tables in the correct order (child tables first)
        # FIXED: Replaced all tab indentation with 4 spaces
        cursor.execute("DELETE FROM user_skills")
        cursor.execute("DELETE FROM follows")
        cursor.execute("DELETE FROM registrations")
        cursor.execute("DELETE FROM group_join_requests")
        cursor.execute("DELETE FROM invitations")
        cursor.execute("DELETE FROM group_members")
        cursor.execute("DELETE FROM groups")
        cursor.execute("DELETE FROM events")
        cursor.execute("DELETE FROM users")
        
        # Reset auto-increment counters
        cursor.execute("DELETE FROM sqlite_sequence")
        
        # Run seeding functions
        create_users(cursor)
        create_events(cursor)
        create_registrations(cursor)
        create_follows(cursor)
        create_skills(cursor)
        create_groups(cursor)
        create_invitations(cursor)

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