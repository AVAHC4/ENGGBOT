-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_color VARCHAR(50) DEFAULT 'bg-blue-500',
  category VARCHAR(100) DEFAULT 'General',
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(100) DEFAULT 'Team Member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(team_id, user_id)
);

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invitee_email VARCHAR(255) NOT NULL,
  invitee_id UUID REFERENCES users(id) ON DELETE CASCADE NULL, -- NULL if user doesn't exist yet
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, expired
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(team_id, invitee_email)
);

-- Create team_notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS team_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  invitation_id UUID REFERENCES team_invitations(id) ON DELETE CASCADE NULL,
  type VARCHAR(50) NOT NULL, -- 'invitation', 'team_update', 'member_joined', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_email ON team_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_notifications_user_id ON team_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_team_notifications_read ON team_notifications(read);

-- Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Teams policies
CREATE POLICY "Users can view teams they are members of or public teams" ON teams
FOR SELECT USING (
  id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid() AND is_active = true
  ) OR 
  true -- For now, allow viewing all teams (modify as needed)
);

CREATE POLICY "Users can create teams" ON teams
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team creators can update their teams" ON teams
FOR UPDATE USING (auth.uid() = created_by);

-- Team members policies
CREATE POLICY "Users can view team members of teams they belong to" ON team_members
FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can join teams if they have valid invitations" ON team_members
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM team_invitations 
    WHERE team_id = team_members.team_id 
    AND (invitee_id = auth.uid() OR invitee_email = (SELECT email FROM users WHERE id = auth.uid()))
    AND status = 'pending'
  )
);

-- Team invitations policies
CREATE POLICY "Users can view invitations they sent or received" ON team_invitations
FOR SELECT USING (
  auth.uid() = inviter_id OR 
  auth.uid() = invitee_id OR 
  invitee_email = (SELECT email FROM users WHERE id = auth.uid())
);

CREATE POLICY "Team members can send invitations" ON team_invitations
FOR INSERT WITH CHECK (
  auth.uid() = inviter_id AND
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = team_invitations.team_id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Users can update invitations they received" ON team_invitations
FOR UPDATE USING (
  auth.uid() = invitee_id OR 
  invitee_email = (SELECT email FROM users WHERE id = auth.uid())
);

-- Team notifications policies
CREATE POLICY "Users can view their own notifications" ON team_notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON team_notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Functions and triggers

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for teams table
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create notification when invitation is created
CREATE OR REPLACE FUNCTION create_invitation_notification()
RETURNS TRIGGER AS $$
DECLARE
  team_name TEXT;
  inviter_name TEXT;
BEGIN
  -- Get team name and inviter name
  SELECT t.name, u.full_name 
  INTO team_name, inviter_name
  FROM teams t, users u 
  WHERE t.id = NEW.team_id AND u.id = NEW.inviter_id;
  
  -- Create notification if invitee exists in users table
  IF NEW.invitee_id IS NOT NULL THEN
    INSERT INTO team_notifications (
      user_id, team_id, invitation_id, type, title, message
    ) VALUES (
      NEW.invitee_id,
      NEW.team_id,
      NEW.id,
      'invitation',
      'Team Invitation',
      inviter_name || ' invited you to join ' || team_name
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notification on invitation
CREATE TRIGGER create_invitation_notification_trigger
AFTER INSERT ON team_invitations
FOR EACH ROW EXECUTE FUNCTION create_invitation_notification();

-- Function to update invitation when user accepts/declines
CREATE OR REPLACE FUNCTION handle_invitation_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Update responded_at timestamp
  NEW.responded_at = NOW();
  
  -- If accepted, add user to team_members
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (NEW.team_id, NEW.invitee_id, 'Team Member')
    ON CONFLICT (team_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invitation response
CREATE TRIGGER handle_invitation_response_trigger
BEFORE UPDATE ON team_invitations
FOR EACH ROW EXECUTE FUNCTION handle_invitation_response();
