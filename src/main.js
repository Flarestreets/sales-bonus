/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   const discount = 1 - (purchase.discount / 100); 
   return purchase.sale_price * purchase.quantity * discount; // Расчет выручки от операции
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */

 // Расчет бонуса от позиции в рейтинге

function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
        return seller.profit * 0.15;

    } else if (index === 1 || index === 2) {
        return seller.profit * 0.10;

    } else if (index === total - 1) {
        return 0;

    } else {
        return seller.profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */

 // Проверка входных данных

function analyzeSalesData(data, options) {
if (
        !data
        || !Array.isArray(data.customers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.purchase_records)
        || data.customers.length === 0
        || data.products.length === 0
        || data.sellers.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка наличия опций

    if (!options || typeof options !== "object") {
        throw new Error('Некорректные опции');
    }

    const { calculateRevenue, calculateBonus } = options;

    if (
        typeof calculateRevenue !== "function"
        || typeof calculateBonus !== "function"
    ) {
        throw new Error('Чего-то не хватает');
    }

    // Подготовка промежуточных данных для сбора статистики

    const sellerStats = data.sellers.map(seller => ({
        ...seller,
        revenue: 0,
        bonus: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    //  Индексация продавцов и товаров для быстрого доступа

    const sellerIndex = sellerStats.reduce((acc, seller) => {
        acc[seller.id] = seller;
        return acc;
    }, {}); // Ключом будет id, значением — запись из sellerStats

    const productIndex = data.products.reduce((acc, product) => {
        acc[product.sku] = product;
        return acc;
    }, {}); // Ключом будет sku, значением — запись из data.products 

    //Расчет выручки и прибыли для каждого продавца

    data.purchase_records.forEach(record => { // Чек 
        const seller = sellerIndex[record.seller_id]; // Продавец
        seller.sales_count += 1; // Увеличить количество продаж 
        seller.revenue += record.total_amount; // Увеличить общую сумму выручки всех продаж

        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku]; // Товар
            const cost = (product.purchase_price ?? 0) * item.quantity; // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
            const revenue = calculateRevenue(item, product) ?? 0;// Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
            const profit = revenue - cost; // Посчитать прибыль: выручка минус себестоимость
            seller.profit += profit; // Увеличить общую накопленную прибыль (profit) у продавца  

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity; // По артикулу товара увеличить его проданное количество у продавца
        });
 }); 
// Сортировка продавцов по прибыли

    sellerStats.sort((a, b) => b.profit - a.profit); 

// Назначение премий на основе ранжирования

   sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);  // расчет бонуса
        seller.top_products = Object.entries(seller.products_sold)
        .map(([sku, quantity]) => ({ sku, quantity }))                 
        .sort((a, b) => b.quantity - a.quantity)                      
        .slice(0, 10);   // Формируем топ-10 товаров   
}); 

    // @TODO: Подготовка итоговой коллекции с нужными полями


    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
}));

    //console.log(sellerIndex["seller_1"].sales_count);
    //console.log(sellerIndex["seller_1"].revenue);
    //console.log(sellerIndex["seller_1"].profit);
    //console.log(sellerIndex["seller_1"].products_sold);
}
