const xmlrpc = require('xmlrpc');
const fs = require('fs');

const odoo = xmlrpc.createSecureClient({
    host: 'test.kcatering.sa',
    port: 443,
    path: '/xmlrpc/2/object'
});

async function listModelFields(models) {
    return new Promise((resolve, reject) => {
        const modelFields = {};

        function fetchModelFields(model) {
            return new Promise((resolve, reject) => {
                odoo.methodCall('execute_kw', [
                    'kcdbmars282024',
                    1086,
                    '6b326e1c71cdef29626b039b1166d6314b7acb0f',
                    model,
                    'fields_get',
                    [],
                    { context: { lang: 'en_US' } }
                ], function (error, fields) {
                    if (error) {
                        console.error('Error fetching fields for model', model, ':', error);
                        reject(error);
                    } else {
                        const fieldNames = Object.keys(fields); // Récupérer uniquement les noms de champ
                        modelFields[model] = fieldNames;
                        resolve();
                    }
                });
            });
        }

        async function fetchAllModelFields() {
            try {
                await Promise.all(models.map(model => fetchModelFields(model)));
                resolve(modelFields);
            } catch (error) {
                reject(error);
            }
        }

        fetchAllModelFields();
    });
}


const modelsToQuery = ['sale.order', 'pos.order', 'pos.config' ,  'account.move', 'product.template', 'product.pricelist', 'pos.session', 'account.payment', 'pos.payment'];

async function saveModelFieldsToFile() {
    try {
        const modelFields = await listModelFields(modelsToQuery);
        fs.writeFile('model_fields.json', JSON.stringify(modelFields, null, 2), err => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('Model fields have been saved to model_fields.json');
            }
        });
    } catch (error) {
        console.error('Error listing model fields:', error);
    }
}

saveModelFieldsToFile();
