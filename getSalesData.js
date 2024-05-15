const xmlrpc = require('xmlrpc');

const odoo = xmlrpc.createSecureClient({
    host: 'test.kcatering.sa',
    port: 443,
    path: '/xmlrpc/2/object'
});

async function listAllDetailsOfModel() {
    return new Promise((resolve, reject) => {
        odoo.methodCall('execute_kw', [
            'kcdbmars282024',  // Nom de la base de données
            1086,              // UID de l'utilisateur
            '6b326e1c71cdef29626b039b1166d6314b7acb0f', // Clé API
            'purchase.report', // Nom du modèle spécifique
            'search_read',     // Méthode pour lire les enregistrements
            [[]],              // Aucun critère de filtre spécifique
            {'fields': []}     // Demande de retourner tous les champs disponibles
        ], function (error, details) {
            if (error) {
                console.error('Error fetching details:', error);
                reject(error);
            } else {
                console.log('All Model Details:', details);
                resolve(details);
            }
        });
    });
}

listAllDetailsOfModel();
