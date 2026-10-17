
/**
 * Функция для расчета выручки
 * @param {Object} purchase запись о покупке
 * @param {Object} product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, product) {
    const discount = 1 - (purchase.discount / 100);
    return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов на основе прибыли
 * @param {number} index порядковый номер в отсортированном массиве
 * @param {number} total общее число продавцов
 * @param {Object} seller карточка продавца
 * @returns {number}
 */
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
 * @param {Object} data
 * @param {Object} options
 * @returns {Object[]}
 */
function analyzeSalesData(data, options) {
    if (
        !data ||
        !Array.isArray(data.customers) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.sellers) ||
        !Array.isArray(data.purchase_records) ||
        data.customers.length === 0 ||
        data.products.length === 0 ||
        data.sellers.length === 0 ||
        data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    if (!options || typeof options !== 'object') {
        throw new Error('Некорректные опции');
    }

    const { calculateRevenue, calculateBonus } = options;

    if (
        typeof calculateRevenue !== 'function' ||
        typeof calculateBonus !== 'function'
    ) {
        throw new Error('Чего-то не хватает');
    }

    const sellerStats = data.sellers.map(seller => ({
        ...seller,
        revenue: 0,
        bonus: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    const sellerIndex = sellerStats.reduce((acc, seller) => {
        acc[seller.id] = seller;
        return acc;
    }, {});

    const productIndex = data.products.reduce((acc, product) => {
        acc[product.sku] = product;
        return acc;
    }, {});

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        record.items.forEach(item => {
            const product = productIndex[item.sku];

            if (!product) {
                throw new Error('Товар не найден');
            }

            const cost = (product.purchase_price ?? 0) * item.quantity;
            const revenue = calculateRevenue(item, product) ?? 0;
            const profit = revenue - cost;

            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }

            seller.products_sold[item.sku] += item.quantity;
        });
    });

    sellerStats.sort((a, b) => b.profit - a.profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}
