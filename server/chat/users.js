class Users {
  constructor() {
    this.users = [];
    this.rooms = [];
  }
  addUser(id, name, room) {
    const namesArray = this.users.map(user => user.name);
    while ((namesArray.indexOf(name) > -1) && (this.rooms.indexOf(room) > -1)) {
      name.concat(' #', namesArray.indexOf(name) + 1);
    }
    const user = { id, name, room };
    this.users.push(user);
    this.rooms.push(room);
    return user;
  }
  removeUser(id) {
    const user = this.getUser(id);

    if (user) {
      this.users = this.users.filter(user => user.id !== id);
    }
    return user;
  }
  getUser(id) {
    return this.users.filter(user => user.id === id)[0];
  }
  getUserList(room) {
    const users = this.users.filter(user => user.room === room);
    const namesArray = users.map(user => user.name);
    return namesArray;
  }
}

module.exports = { Users };
