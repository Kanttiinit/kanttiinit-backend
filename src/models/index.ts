import { Sequelize } from 'sequelize';
import createArea from './Area';
import createFavorite from './Favorite';
import createMenu from './Menu';
import createRestaurant from './Restaurant';
import createUser from './User';
import createUpdate from './Update';
import createChange from './Change';

import * as environment from '../environment';

export const sequelize = new Sequelize(environment.databaseURL, {
  logging: environment.sequelizeLogging ? console.log : false
});

export const Area = createArea(sequelize, Sequelize);
export const Favorite = createFavorite(sequelize, Sequelize);
export const Menu = createMenu(sequelize, Sequelize);
export const Restaurant = createRestaurant(sequelize, Sequelize);
export const User = createUser(sequelize, Sequelize);
export const Update = createUpdate(sequelize, Sequelize);
export const Change = createChange(sequelize, Sequelize);

Area.hasMany(Restaurant);
Menu.belongsTo(Restaurant);
Restaurant.hasMany(Menu);
Restaurant.belongsTo(Area);
