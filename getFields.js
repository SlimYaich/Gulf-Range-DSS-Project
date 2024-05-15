const xmlrpc = require('xmlrpc');
const fs = require('fs'); // Module pour les opérations sur les fichiers

const odoo = xmlrpc.createSecureClient({
    host: 'test.kcatering.sa',
    port: 443,
    path: '/xmlrpc/2/object'
});

async function getDateOrderData() {
    return new Promise((resolve, reject) => {
        // Utilisation de 'execute_kw' pour récupérer les données du champ 'date_order' du modèle 'sale.order'
        odoo.methodCall('execute_kw', [
            'kcdbmars282024',  // Nom de la base de données
            1086,              // UID de l'utilisateur
            '6b326e1c71cdef29626b039b1166d6314b7acb0f', // Clé API
            'sale.order',      // Spécifiez ici le modèle 'sale.order'
            'search_read',     // Méthode pour lire les données
            [[]],              // Conditions de recherche (vide pour tout récupérer)
            {fields: ['partner_shipping_id']}  // Champs à récupérer, spécifiquement 'date_order'
        ], function (error, result) {
            if (error) {
                console.error('Error fetching date_order data:', error);
                reject(error);
            } else {
                console.log('date_order data:', result);
                // Écriture des données dans un fichier JSON
                fs.writeFile('partner.json', JSON.stringify(result, null, 2), (err) => {
                    if (err) {
                        console.error('Error writing file:', err);
                        reject(err);
                    } else {
                        console.log('Date order data saved to partner.json');
                        resolve(result);
                    }
                });
            }
        });
    });
}

getDateOrderData();
