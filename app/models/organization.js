const fs = require('fs');
const path = require('path');

class Organization {
  static #organizations = null;

  static loadOrganizations() {
    if (!this.#organizations) {
      const organizationsPath = path.join(__dirname, '../data/organizations.json');
      this.#organizations = JSON.parse(fs.readFileSync(organizationsPath, 'utf8'));
    }
    return this.#organizations;
  }

  static getAll() {
    return this.loadOrganizations();
  }

  static getByCode(code) {
    const organizations = this.loadOrganizations();
    return organizations.find(org => org.code === code);
  }

  static getDepartmentName(code) {
    const organization = this.getByCode(code);
    return organization ? organization.name : null;
  }
}

module.exports = Organization; 