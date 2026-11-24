'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const passwordHash = await bcrypt.hash('123@123', 10);

    await queryInterface.bulkInsert('users', [
      {
        firstname: 'Admin',
        surname: 'DripStore',
        email: 'admin@dripstore.com',
        password: passwordHash,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('categories', [
      { name: 'Tênis', slug: 'tenis', use_in_menu: true, created_at: now, updated_at: now },
      { name: 'Camisetas', slug: 'camisetas', use_in_menu: true, created_at: now, updated_at: now },
      { name: 'Ofertas', slug: 'ofertas', use_in_menu: false, created_at: now, updated_at: now },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('categories', {
      slug: ['tenis', 'camisetas', 'ofertas'],
    });
    await queryInterface.bulkDelete('users', {
      email: 'admin@dripstore.com',
    });
  },
};
