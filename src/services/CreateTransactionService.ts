import AppError from '../errors/AppError';
import { getCustomRepository, getRepository } from 'typeorm';

import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';
import { request } from 'express';
import Category from '../models/Category';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionRepository);
    const categoriesRepository = getRepository(Category);

    /** should not be able to create outcome transaction without a valid balance
    *  Retornar um erro caso o saldo esteja negativo
    */
    // Total do saldo atual
    const { total } = await transactionsRepository.getBalance();

    // Transação do tipo saque e valor maior que saldo => Retornará um error
    if(type === 'outcome' && total < value){
      throw new AppError("You do not have enough balance");
    }
    /** Verificando se já existe a categoria informada da transação e
     * armazenando em um variável let, podendo ser alterada fora do escopo **/
    let objCategory = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!objCategory) {
      objCategory = categoriesRepository.create({
        title: category,
      });

      await categoriesRepository.save(objCategory);
    }

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category: objCategory,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
