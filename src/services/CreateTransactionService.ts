import AppError from '../errors/AppError';
import { getCustomRepository } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionRepository from '../repositories/TransactionsRepository';
import CategoriesRepository from '../repositories/CategoriesRepository';
import { request } from 'express';


interface Request{
  title: string;
  type:  'income' | 'outcome';
  value: number;
  category: string;
}

class CreateTransactionService {
  public async execute({title, type, value, category}: Request): Promise<Transaction> {

    const transactionsRepository = getCustomRepository(TransactionRepository);
    const categoriesRepository = getCustomRepository(CategoriesRepository);

    const findCategoryExist = await categoriesRepository.findOne({where: {title: category}});

    let category_id;
    if(!findCategoryExist){
      const objCategory = categoriesRepository.create({
          title: category,
      });
      await categoriesRepository.save(objCategory);
      category_id = objCategory.id;
    }else{
      category_id = findCategoryExist.id;
    }

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category_id
    });

    await transactionsRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
