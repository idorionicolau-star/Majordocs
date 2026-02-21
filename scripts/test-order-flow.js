const admin = require('firebase-admin');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function runTest() {
    console.log("=== INICIANDO SIMULAÇÃO DE FINALIZAÇÃO DE ENCOMENDA ===");
    try {
        // 1. Get a company ID
        const companiesSnapshot = await db.collection('companies').limit(1).get();
        if (companiesSnapshot.empty) {
            throw new Error("Nenhuma empresa encontrada para teste.");
        }
        const companyId = companiesSnapshot.docs[0].id;
        console.log(`✓ Usando Empresa ID: ${companyId}`);

        // 2. Setup Test Data
        const productRef = db.collection(`companies/${companyId}/products`).doc();
        const orderRef = db.collection(`companies/${companyId}/orders`).doc();
        const saleRef = db.collection(`companies/${companyId}/sales`).doc();

        const initialStock = 50;
        const initialReserved = 10;
        const orderQuantity = 10;
        const totalValue = 100;

        await productRef.set({
            name: "Pão Francês (Teste)",
            stock: initialStock,
            reservedStock: initialReserved,
            price: 10,
            location: "Principal"
        });

        await orderRef.set({
            productId: productRef.id,
            productName: "Pão Francês (Teste)",
            quantity: orderQuantity,
            quantityProduced: orderQuantity, // assuming it's produced
            status: "Concluída", // ready to be finalized
            unit: "un",
            location: "Principal"
        });

        await saleRef.set({
            orderId: orderRef.id,
            productName: "Pão Francês (Teste)",
            quantity: orderQuantity,
            totalValue: totalValue,
            amountPaid: 0,
            status: "Pendente",
            paymentStatus: "Pendente"
        });

        console.log(`✓ Dados Iniciais Criados: Produto (${initialStock} stock, ${initialReserved} reservado), Encomenda (Qtd: ${orderQuantity})`);

        // 3. RUN LOGIC (Simulating finalizeOrder from inventory-context.tsx)
        console.log("\n--- EXECUTANDO transaction DE FINALIZAR ENCOMENDA ---");
        const finalPayment = 100;
        const orderId = orderRef.id;
        const user = { username: "AdminTest", id: "user123" };

        await db.runTransaction(async (transaction) => {
            const orderSnap = await transaction.get(orderRef);
            const orderData = orderSnap.data();

            const saleSnap = await transaction.get(saleRef);
            const freshSaleData = saleSnap.data();

            const productSnap = await transaction.get(productRef);
            const freshProductData = productSnap.data();

            // writes
            const newAmountPaid = (freshSaleData.amountPaid || 0) + finalPayment;
            transaction.update(saleRef, {
                amountPaid: newAmountPaid,
                status: 'Levantado',
                paymentStatus: newAmountPaid >= freshSaleData.totalValue ? 'Pago' : 'Parcial'
            });

            transaction.update(orderRef, { status: 'Entregue' });

            const locationToUse = orderData.location || "Principal";

            // 6a. Add to 'productions'
            const productionsRef = db.collection(`companies/${companyId}/productions`).doc();
            transaction.set(productionsRef, {
                date: new Date().toISOString().split('T')[0],
                productName: orderData.productName,
                quantity: orderData.quantity,
                unit: orderData.unit,
                registeredBy: user.username,
                status: 'Concluído',
                location: locationToUse,
                orderId: orderId
            });

            // 6b. Register Stock Movement (IN: Production) and (OUT: Delivery)
            const movementInRef = db.collection(`companies/${companyId}/stockMovements`).doc();
            transaction.set(movementInRef, {
                productId: productRef.id,
                productName: orderData.productName,
                type: 'IN',
                quantity: orderData.quantity,
                toLocationId: locationToUse,
                reason: `Produção (Encomenda #${orderId.slice(-6).toUpperCase()})`,
                userId: user.id,
                userName: user.username,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            const movementOutRef = db.collection(`companies/${companyId}/stockMovements`).doc();
            transaction.set(movementOutRef, {
                productId: productRef.id,
                productName: orderData.productName,
                type: 'OUT',
                quantity: orderData.quantity,
                fromLocationId: locationToUse,
                reason: `Venda (Levantamento Encomenda #${orderId.slice(-6).toUpperCase()})`,
                userId: user.id,
                userName: user.username,
                saleId: saleRef.id,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // 6c. Deduct Reserved Stock (Actual Stock stays same because +Prod -Sale = 0)
            let newReserved = freshProductData.reservedStock - orderData.quantity;
            if (newReserved < 0) newReserved = 0;

            transaction.update(productRef, {
                reservedStock: newReserved,
                lastUpdated: new Date().toISOString()
            });
        });

        console.log("✓ Transação executada com sucesso!");

        // 4. Verify the results
        console.log("\n--- VERIFICANDO RESULTADOS NO FIREBASE ---");

        const finalProductSnap = await productRef.get();
        const finalProduct = finalProductSnap.data();
        console.log(`Produto -> Stock Atual: ${finalProduct.stock} | Stock Reservado: ${finalProduct.reservedStock}`);
        if (finalProduct.stock === initialStock && finalProduct.reservedStock === (initialReserved - orderQuantity)) {
            console.log("  => CORRETO: Stock físico manteve-se (Entrou produção, saiu venda). Stock reservado diminuiu corretamente.");
        } else {
            console.error("  => ERRO NO CALCULO DO STOCK");
        }

        const finalOrderSnap = await orderRef.get();
        console.log(`Encomenda -> Status: ${finalOrderSnap.data().status}`);

        const finalSaleSnap = await saleRef.get();
        console.log(`Venda -> Status: ${finalSaleSnap.data().status} | Pago: ${finalSaleSnap.data().amountPaid}`);

        const productionsSnap = await db.collection(`companies/${companyId}/productions`).where("orderId", "==", orderId).get();
        console.log(`Produções geradas: ${productionsSnap.size} (Esperado 1)`);

        const movementsSnap = await db.collection(`companies/${companyId}/stockMovements`).where("productId", "==", productRef.id).get();
        console.log(`Movimentações de stock geradas: ${movementsSnap.size} (Esperado 2: 1 IN, 1 OUT)`);

        console.log("\n=== TESTE CONCLUÍDO COM SUCESSO ===");

        // Cleanup
        await productRef.delete();
        await orderRef.delete();
        await saleRef.delete();
        if (!productionsSnap.empty) await productionsSnap.docs[0].ref.delete();
        if (!movementsSnap.empty) {
            for (let doc of movementsSnap.docs) {
                await doc.ref.delete();
            }
        }
        console.log("✓ Dados de teste removidos.");

    } catch (error) {
        console.error("ERRO NO TESTE:", error);
    }
}

runTest();
