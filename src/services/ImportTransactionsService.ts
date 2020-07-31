import AppError from '../errors/AppError';
import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';

import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

import fs from 'fs';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    // Leitura do arquivo com o path
    const contactsReadStream = fs.createReadStream(filePath);

    const transactions : CSVTransaction[] = [];
    const categories:string[] = [];

    // Instanciando o objeto para trabalhar com o csv
    const parsers = csvParse({
      from_line:2, // Configurando o constructor para iniciar da linha 2 do .csv
    });

    // Vai lendo as linhas conforme forem surgindo pipe
    const parseCSV = contactsReadStream.pipe(parsers);

    // A cada linha é destruturado por tipo
    parseCSV.on('data', async line => {
      const [title, type, value, category ] = line.map((cell: string)=>
       cell.trim(),
      );

      // Obriga a linha a ter esses três campos no mínimo
      if(!title || !type || !value ) return;

      categories.push(category);

      transactions.push({title, type, value, category });
    });
    // Verifica se o parseCSV emitiu um evento end
    await new Promise(resolve => parseCSV.on('end', resolve));

    /** Bookin INsert */
    // Listar todas as categorias que existem no banco passando um IN
    // SELECT * FROM public.category WHERE title IN {CATEGORIES}
    const categoriesRepository = getRepository(Category);
    const exitentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      }
    });

   const exitentCategoriesTitles =  exitentCategories.map(
     ( category: Category ) => category.title
    );

  const addCategoryTitles = categories
    .filter(category => !exitentCategoriesTitles.includes(category),) // not in
    .filter((value, index, self) => self.indexOf(value) === index); // remover uplicadasd

  /** Persistindo no banco */
  const newCategories = categoriesRepository.create(
    addCategoryTitles.map(title => ({
      title,
    })),
   );

   await categoriesRepository.save(newCategories);

   /** Perisistindo transações */
    const finalCategories = [...newCategories, ...exitentCategories];

   const transactionsRepository = getCustomRepository(TransactionRepository);
   const createdTransactions = transactionsRepository.create(
     transactions.map( transaction => ({
      title: transaction.title,
      type: transaction.type,
      value: transaction.value,
      category: finalCategories.find(
        category => category.title === transaction.category,
      ),
     })),
   );

   await transactionsRepository.save(createdTransactions);

   await fs.promises.unlink(filePath);

   return createdTransactions;

  }
}

export default ImportTransactionsService;
