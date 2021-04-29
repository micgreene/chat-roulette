# Chatter

## Vision

We are building a chat roulette application. Users will be able to create an account or log in to an existing account in order to access the app functionality. Upon login, users will be paired in rooms. After a set period, the system will notify ALL users that they are about to change rooms. At this point, the current users will be shuffled into new pairs.

**What is the vision of this product?**
The stretch goal is to gamify the project so that users are competing against each other when paired into their random rooms. The minimum viable product will serve just as a random chatting application, but the ultimate vision is to be a competitive style system.

**What pain point does this project solve?**
The purpose of the application is entertainment.

**Why should we care about your product?**
It will be a fun and secure game.

## Scope (In/Out)

**Features Overview**

- Chatter will provide secure login and authentication to users
- Chatter will pair users randomly for a period of open chatting
- Chatter will randomly reassign users for future chatting periods
- Chatter will eventually implement some gaming aspect into the pairings
- Chatter will log and store conversations persistently

**What Product Will Not Do**
- Chatter does not have a front end
- Chatter will not allow for users to select their chatting partner

## Minimum Viable Product vs

MVP is a system where users login from their terminal, gain access to the app, and are able to chat in randomly assigned pairs that cycle after a given period.

## Stretch

Stretch goals are to gamify the pairing and ultimately create a tournament style system where winners are consistently paired together until we reach one ultimate winner.

## Functional Requirements

- Users can create new accounts from the terminal
- Users with existing accounts can log in from the terminal
- **Probably a stretch goal**: users can LOG OUT from the terminal
- Users can chat with their randomly assigned parters in realtime
- **Stretch Goal** Users will compete in some kind of game
- **Stretch Goal** Users with enough "wins" can access more advanced rooms in the app

## Data Flow

![Diagram of Data Flow](./assets/DomainModel.jpg)

## Non Functional Requirements

**Security** we will follow the best practice of keeping the user database to only minimal user info (i.e. id, username, hashed password). There will be a separate user profile with a shared ID that we can use to access further information about the user as we need later to store game stats, or any other profile information that is necessary.

**Usability** Basic usability best practices will be used (i.e. requiring unique usernames).

## Domain Modeling

![Domain Modeling](./assets/ERDiagram.jpg)
