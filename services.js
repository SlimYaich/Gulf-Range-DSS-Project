const { Worker } = require('worker_threads');
const xmlrpc = require('xmlrpc');
const path = require('path');
require('dotenv').config();

const host = process.env.ODOO_HOST || 'lms.kcatering.sa';
const dbName = process.env.ODOO_DB_NAME || 'DBPROD';
const userId = process.env.ODOO_USER_ID || 662;
const password = process.env.ODOO_PASSWORD || 'a68d8b2dca751b38c66bfc8c0f9293eb4b3edc24';

const client = xmlrpc.createSecureClient({
  url: `https://${host}/xmlrpc/2/object`
});

function createWorker(task) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, 'worker.js'), { workerData: task });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

function execute_rpc(model, method, params, retryCount = 3) {
  return new Promise((resolve, reject) => {
    client.methodCall('execute_kw', [dbName, userId, password, model, method, params], (error, value) => {
      if (error) {
        if (retryCount > 0) {
          console.warn(`Retrying... (${retryCount - 1} attempts left)`);
          return resolve(execute_rpc(model, method, params, retryCount - 1));
        } else {
          console.error('Erreur lors de l\'exécution de la méthode:', error);
          return reject(error);
        }
      }
      resolve(value);
    });
  });
}

async function getTotalSalesAndPassengers(socket, startDate, endDate) {
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0] + ' 00:00:00';
  };

  if (!startDate || !endDate) {
    console.error('Invalid date range');
    return;
  }

  startDate = formatDate(startDate);
  endDate = formatDate(endDate);

  console.log(`Fetching POS configurations between ${startDate} and ${endDate}`);
  
  try {
    const posConfigs = await execute_rpc('pos.config', 'search_read', [[], ['id', 'name', 'branch_id']]);
    console.log(`POS configurations fetched: ${JSON.stringify(posConfigs)}`);

    const posSalesData = [];
    const tasks = posConfigs.map((posConfig, index) => {
      const task = {
        model: 'pos.order',
        method: 'search_read',
        params: [
          [['config_id', '=', posConfig.id], ['date_order', '>=', startDate], ['date_order', '<=', endDate]], ['id', 'payment_ids', 'amount_tax', 'amount_total']
        ],
        id: index
      };
      return createWorker(task).then(result => ({ posConfig, result }));
    });

    const results = await Promise.all(tasks);

    let globalPayments = {};
    let globalTaxes = {};
    let finalTotalAfterTaxes = 0;

    for (const { posConfig, result } of results) {
      if (result.error) {
        console.error('Erreur lors de la récupération des commandes:', result.error);
        continue;
      }
      const orders = result.result;

      let totalSales = 0;
      let totalPassengers = orders.length;
      let totalAfterTaxes = 0;
      let productsSold = [];
      let payments = [];
      let taxes = [];

      console.log(`Orders for POS config ${posConfig.name} (${posConfig.id}): ${JSON.stringify(orders)}`);

      const orderLineTasks = orders.map(order => createWorker({
        model: 'pos.order.line',
        method: 'search_read',
        params: [[['order_id', '=', order.id]], ['product_id', 'qty', 'price_unit', 'price_subtotal']],
        id: order.id
      }));

      const orderLineResults = await Promise.all(orderLineTasks);

      for (const orderLinesResult of orderLineResults) {
        if (orderLinesResult.error) {
          console.error(`Erreur lors de la récupération des lignes de commande pour la commande ${orderLinesResult.id}:`, orderLinesResult.error);
          continue;
        }

        for (const line of orderLinesResult.result) {
          console.log(`Order line for order ${orderLinesResult.id}: ${JSON.stringify(line)}`);
          totalSales += line.price_subtotal || 0;
          productsSold.push({
            name: line.product_id[1],
            quantity: line.qty,
            priceUnit: line.price_unit
          });
        }
      }

      const paymentTasks = orders.map(order => createWorker({
        model: 'pos.payment',
        method: 'search_read',
        params: [[['id', 'in', order.payment_ids]], ['amount', 'payment_method_id']],
        id: order.id
      }));

      const paymentResults = await Promise.all(paymentTasks);

      for (const paymentResult of paymentResults) {
        if (paymentResult.error) {
          console.error(`Erreur lors de la récupération des paiements pour la commande ${paymentResult.id}:`, paymentResult.error);
          continue;
        }

        for (const payment of paymentResult.result) {
          const methodName = payment.payment_method_id[1];
          const amount = payment.amount || 0;
          payments.push({ method: methodName, amount });
          if (globalPayments[methodName]) {
            globalPayments[methodName] += amount;
          } else {
            globalPayments[methodName] = amount;
          }
        }
      }

      const taxTasks = orders.map(order => createWorker({
        model: 'account.tax',
        method: 'search_read',
        params: [[['id', 'in', order.tax_ids]], ['name', 'amount', 'amount_total']],
        id: order.id
      }));

      const taxResults = await Promise.all(taxTasks);

      for (const taxResult of taxResults) {
        if (taxResult.error) {
          console.error(`Erreur lors de la récupération des taxes pour la commande ${taxResult.id}:`, taxResult.error);
          continue;
        }

        for (const tax of taxResult.result) {
          taxes.push({
            name: tax.name,
            amount: tax.amount,
            base: tax.amount_total
          });
          if (globalTaxes[tax.name]) {
            globalTaxes[tax.name].amount += tax.amount;
            globalTaxes[tax.name].base += tax.amount_total;
          } else {
            globalTaxes[tax.name] = {
              amount: tax.amount,
              base: tax.amount_total
            };
          }
        }
      }

      totalAfterTaxes = totalSales + (taxes.reduce((acc, tax) => acc + tax.amount, 0));
      finalTotalAfterTaxes += totalAfterTaxes;

      posSalesData.push({
        posName: posConfig.name,
        totalSales,
        totalPassengers,
        totalAfterTaxes,
        productsSold,
        payments,
        taxes
      });
    }

    // Afficher les résultats dans la console
    console.log('Résultats pour chaque point de vente :', JSON.stringify(posSalesData, null, 2));
    console.log('Global Payments:', JSON.stringify(globalPayments, null, 2));
    console.log('Global Taxes:', JSON.stringify(globalTaxes, null, 2));
    console.log('Final Total After Taxes:', finalTotalAfterTaxes);

    // Envoyer les résultats via le socket pour l'affichage dans l'interface utilisateur
    socket.emit('salesUpdate', { posSalesData, globalPayments, globalTaxes, finalTotalAfterTaxes });

  } catch (error) {
    console.error('Erreur lors de la récupération des configurations de points de vente :', error);
  }
}

module.exports = { getTotalSalesAndPassengers };
