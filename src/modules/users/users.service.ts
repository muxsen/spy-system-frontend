import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async addChannelLink(telegramId: number, source: string, target: string) {
    return await this.userModel.findOneAndUpdate(
      { telegramId },
      { $push: { links: { source, target } } }, // Добавляем новую связку в массив
      { new: true }
    );
  }

  async findOne(telegramId: number) {
    return await this.userModel.findOne({ telegramId });
  }
}