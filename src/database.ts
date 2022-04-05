import { Sequelize, DataTypes, Model } from "sequelize";
import dotenv from "dotenv";

// Database Environment Vars
dotenv.config();
const db = process.env.DATABASE!;
const user = process.env.POSTGRES_USER!;
const pass = process.env.POSTGRES_PASSWORD!;
const host = process.env.POSTGRES_HOST!;
const develop = process.env.DEVELOP!;

// Configure Database
const sequelize = new Sequelize(db, user, pass, {
  host: host,
  dialect: "postgres",
});

// Construct Model
class Plan extends Model {
  declare id: number;
  declare title: string;
  declare spots: number;
  declare participants: string[];
  declare messageId: string;
  declare channelId: string;
}

// Initialize Plan
Plan.init(
  {
    id: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      primaryKey: true,
    },
    title: {
      type: DataTypes.TEXT,
      defaultValue: ":notebook_with_decorative_cover: Game Plan",
      allowNull: false,
    },
    spots: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      allowNull: false,
    },
    participants: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
      allowNull: false,
    },
    messageId: DataTypes.TEXT,
    channelId: DataTypes.TEXT,
  },
  {
    tableName: "plan",
    sequelize, // passing the `sequelize` instance is required
  }
);

// CRUD
export class Database {
  guildId: any;
  constructor(guildId: any) {
    this.guildId = guildId;
  }
  async create(user: string, title?: string, spots?: number) {
    await this.delete();
    return await Plan.create({
      id: this.guildId,
      title: title,
      spots: spots,
      participants: [user],
    });
  }
  async read() {
    return await Plan.findByPk(this.guildId);
  }

  async update(plan: { save: () => any }) {
    return await plan.save();
  }

  async delete() {
    const plan = await this.read();
    if (plan) await plan.destroy();
  }

  async join(user: any) {
    var plan = await this.read();
    if (!plan) return await this.create(user);

    const participants = Object.assign([], plan.participants);
    const spots = plan.spots;

    if (participants.includes(user) || !(participants.length < spots)) return;
    participants.push(user);

    plan.participants = participants;

    return await this.update(plan);
  }

  async leave(user: any) {
    const plan = await this.read();
    if (!plan) return;

    const participants = Object.assign([], plan.participants);

    if (!participants.includes(user)) return;

    plan.participants = participants.filter((u: any) => u != user);
    return await this.update(plan);
  }

  async rename(title: any) {
    const plan = await this.read();
    if (!plan) return;

    plan.title = title;

    return await this.update(plan);
  }

  async lastMessage(channelId: any, messageId: any) {
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
