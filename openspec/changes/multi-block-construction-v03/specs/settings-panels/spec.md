## ADDED Requirements

### Requirement: Project details editing
The Settings page SHALL include a Project Details section where users can edit the project name, address/location, and view/modify the building type setup.

#### Scenario: Edit project name
- **WHEN** user changes the project name in Settings
- **THEN** the new name is saved and reflected in the app header and all views

#### Scenario: Edit project address
- **WHEN** user changes the project address in Settings
- **THEN** the new address is saved

#### Scenario: View building type summary
- **WHEN** user views the Project Details section
- **THEN** a summary of blocks and their construction methods is displayed
- **AND** a link to edit the block setup is available

### Requirement: Account section
The Settings page SHALL include an Account section with user profile basics.

#### Scenario: View account info
- **WHEN** user views the Account section
- **THEN** their email address is displayed

#### Scenario: Sign out
- **WHEN** user clicks "Sign Out" in the Account section
- **THEN** the user is signed out and redirected to the login page

#### Scenario: Change password
- **WHEN** user clicks "Change Password"
- **THEN** a password change form is shown (current password + new password + confirm)
