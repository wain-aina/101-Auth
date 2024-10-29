# Pre-requisites
 
Install Git, MongoDB & NodeJS (if you haven't);

The project uses GitBash which comes installed with Git.

# Package dependencies

Once you have extracted the project in you preferred location, navigate to the bash terminal inside vs code.

Run the following command inside  to install the project dependencies:

npm install

# ENV Variables

In the .env file, add the following:

DB_LOCATION : (IP Address of the machine running mongodb): 127.0.0.1 (default if you are using localhost);

DB_NAME : *Can be any of your choosing*

AUTH_EMAIL : *This is the email address that will be used for password reset. This project uses smtp gmail protocol thus a gmail account is required*

AUTH_APP_PASS : *This is the password to your email account. Because Google doesn't allow you to use your actual password, it uses a pseudo password known as app password. Follow this link for instructions on how to acquire it* https://knowledge.workspace.google.com/kb/how-to-create-app-passwords-000009237

API_KEY : *Retrieve API_KEY from this website* https://www.exchangerate-api.com/

# Run The Program

Once the above requirements have been fulfilled, run the following command;

npx nodemon index

This command will start the server as well as initiate connection to the database.

# Enjoy

ENJOY
