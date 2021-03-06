export default (sequelize, DataTypes) => {
  const Change = sequelize.define(
    'Change',
    {
      modelName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      modelFilter: { type: DataTypes.JSONB, allowNull: false },
      change: { type: DataTypes.JSONB, allowNull: false },
      appliedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      appliedBy: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      tableName: 'changes',
      validate: {
        modelExistsAndHasChangeFormatter() {
          const model = sequelize.models[this.modelName];
          if (!model) {
            throw new Error(`Model "${this.modelName}" does not exist.`);
          }

          const unallowedFields = Object.keys(this.change).filter(
            key => !model.changeableFields.includes(key)
          );
          if (unallowedFields.length) {
            throw new Error(
              `Creating a change is not allowed for the following fields: ${unallowedFields.join(
                ', '
              )}.`
            );
          }
        }
      }
    }
  );

  Change.prototype.fetchModelInstance = async function() {
    const model = sequelize.models[this.modelName];

    if (!model) {
      throw new Error(`No such model "${this.modelName}".`);
    }

    const item = await model.findOne({
      where: this.modelFilter
    });

    if (!item) {
      throw new Error('No model instance found.');
    }

    return item;
  };

  Change.prototype.getPublicAttributes = function() {
    return {
      createdAt: this.createdAt,
      appliedAt: this.appliedAt,
      change: this.change,
      modelName: this.modelName
    };
  };

  Change.prototype.prettyPrint = async function() {
    const item = await this.fetchModelInstance();
    return item.formatChange(this.change);
  };

  Change.prototype.apply = async function(appliedBy: string) {
    if (this.appliedAt) {
      throw new Error(
        `This change has already been applied at ${this.appliedAt} by ${this.appliedBy}`
      );
    }

    const item = await this.fetchModelInstance();

    await sequelize.transaction(async transaction => {
      await item.update(this.change, { transaction });
      return this.update(
        {
          appliedAt: new Date(),
          appliedBy
        },
        { transaction }
      );
    });
  };
  return Change;
};
