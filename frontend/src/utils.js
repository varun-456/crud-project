// src/utils.js
export const getRole = (address) => {
    switch (address) {
      case '0xAdminAddress':
        return 'Admin';
      case '0xLawyerAddress':
        return 'Lawyer';
      default:
        return 'User';
    }
  };
  