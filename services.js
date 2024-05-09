const xmlrpc = require('xmlrpc');

// Creation of secure client to communicate with Odoo server via XML-RPC
const odoo = xmlrpc.createSecureClient({
    host: 'test.kcatering.sa', // Host modified to use the correct domain
    port: 443, // Secure port for HTTPS communication
    path: '/xmlrpc/2/object' // Path to access the objects API
});






// Function to count the entries in the account.move model
async function countAccountMoveEntries() {
    return new Promise((resolve, reject) => {
        odoo.methodCall('execute_kw', [
            'kcdbmars282024',  // Database name
            1086,              // User ID
            '6b326e1c71cdef29626b039b1166d6314b7acb0f', // API key for authentication
            'account.move',    // Model to query
            'search_count',    // Method to count entries
            [[]],              // No specific filters
        ], function (error, result) {
            if (error) {
                console.error('Error:', error);
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}


// Count the total number of partners in the "res.partner" model:

async function countTotalPartners() {
    return new Promise((resolve, reject) => {
        odoo.methodCall('execute_kw', [
            'kcdbmars282024',  
            1086,              
            '6b326e1c71cdef29626b039b1166d6314b7acb0f', 
            'res.partner',     
            'search_count',    
            [[]],              
        ], function (error, result) {
            if (error) {
                console.error('Error:', error);
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}




// Count the total amounts of validated orders

async function calculateSalesRevenue() {
    return new Promise((resolve, reject) => {
        odoo.methodCall('execute_kw', [
            'kcdbmars282024',  
            1086,              
            '6b326e1c71cdef29626b039b1166d6314b7acb0f', 
            'sale.order',      
            'search_read',    
            [[['state', 'in', ['sale', 'done']]], ['amount_total']], 
        ], function (error, result) {
            if (error) {
                console.error('Error:', error);
                reject(error);
            } else {
                // Calculation of total revenue from order amounts
                const totalRevenue = result.reduce((acc, order) => acc + order.amount_total, 0);
                resolve(totalRevenue);
            }
        });
    });
}


// Calculate the total number of orders placed by customers

async function calculateTotalOrders() {
    return new Promise((resolve, reject) => {
        odoo.methodCall('execute_kw', [
            'kcdbmars282024',  
            1086,             
            '6b326e1c71cdef29626b039b1166d6314b7acb0f', 
            'sale.order',      
            'search_count',    
            [[]],              
        ], function (error, result) {
            if (error) {
                console.error('Error:', error);
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}













module.exports = {
    countAccountMoveEntries,
    countTotalPartners,
	calculateSalesRevenue,
	calculateTotalOrders,
	
    // Expose this function for use in app.js
};





