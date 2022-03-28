const Sequelize = require("sequelize");
const dotenv = require("dotenv");

// Environment Vars
dotenv.config();
const db = process.env.DATABASE;
const user = process.env.POSTGRES_USER;
const pass = process.env.POSTGRES_PASSWORD;
const host = process.env.POSTGRES_HOST;
const develop = process.env.DEVELOP;

// Configure Database
const sequelize = new Sequelize(db, user, pass, {
  host: host,
  dialect: "postgres",
});

// Construct Model
const Plan = sequelize.define("plan", {
  id: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false,
    primaryKey: true,
  },
  title: {
    type: Sequelize.TEXT,
    defaultValue: ":notebook_with_decorative_cover: Game Plan",
    allowNull: false,
  },
  spots: {
    type: Sequelize.INTEGER,
    defaultValue: 10,
    allowNull: false,
  },
  participants: {
    type: Sequelize.ARRAY(Sequelize.TEXT),
    defaultValue: [],
    allowNull: false,
  },
  messageId: Sequelize.TEXT,
  channelId: Sequelize.TEXT,
});

// CRUD
class Database {
  constructor(guildId) {
    this.guildId = guildId;
  }
  async create(title, spots) {
    await this.delete();
    return await Plan.create({
      id: this.guildId,
      title: title,
      spots: spots,
    });
  }
  async read() {
    return await Plan.findByPk(this.guildId);
  }

  async update(plan) {
    return await plan.save();
  }

  async delete() {
    const plan = await this.read();
    if (plan) await plan.destroy();
  }

  async join(user) {
    var plan = await this.read();
    if (!plan) plan = await this.create();

    const participants = Object.assign([], plan.participants);
    const spots = plan.spots;

    if (participants.includes(user) || !(participants.length < spots)) return;
    participants.push(user);

    plan.participants = participants;

    return await this.update(plan);
  }

  async leave(user) {
    const plan = await this.read();
    if (!plan) return;

    const participants = Object.assign([], plan.participants);

    if (!participants.includes(user)) return;

    plan.participants = participants.filter((u) => u != user);
    return await this.update(plan);
  }
  async lastMessage(channelId, messageId) {
    const plan = await this.read();
    if (!plan) return;

    plan.channelId = channelId;
    plan.messageId = messageId;

    return await this.update(plan);
  }
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");

    // Refresh Table (change to true to clear all data)
    if (parseInt(develop)) {
      await sequelize.sync({ force: true });
    } else {
      await sequelize.sync({ force: false });
    }

    // Add database test commands here
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
})();

exports.Database = Database;
