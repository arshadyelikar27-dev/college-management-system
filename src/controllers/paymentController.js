const db = require('../models/db');
const { v4: uuidv4 } = require('uuid');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const getConfig = (req, res) => {
    res.json({ key: process.env.KEY_ID });
};

const createOrder = async (req, res) => {
    try {
        const { amount, admissionId } = req.body;

        if (!amount) {
            return res.status(400).json({ message: "Amount is required" });
        }

        const instance = new Razorpay({
            key_id: process.env.KEY_ID,
            key_secret: process.env.KEY_SECRET,
        });

        const options = {
            amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
            currency: "INR",
            receipt: `rcpt_${uuidv4().substring(0, 8)}`,
        };

        const order = await instance.orders.create(options);

        res.json({
            id: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (error) {
        console.error("Razorpay Order Creation Error:", error);
        res.status(500).json({ message: "Could not create Razorpay order." });
    }
};

const verifyPayment = (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            admissionId,
            amount // We can pass this from frontend to record it
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Incomplete payment details" });
        }

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            // Check for duplicate payment processing
            const existingPayment = db.findOne('payments', p => p.orderId === razorpay_order_id);
            if (existingPayment) {
                return res.status(400).json({ message: "Payment already processed." });
            }

            // Create Payment schema record
            const newPayment = {
                id: uuidv4(),
                studentId: req.user.id,
                name: req.user.name,
                email: req.user.email || 'N/A',
                amount: amount || 0,
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                status: "success",
                createdAt: new Date().toISOString()
            };
            db.create('payments', newPayment);

            // Update admission status to "Paid"
            if (admissionId) {
                db.update('admissions', admissionId, { 
                    status: 'Paid', 
                    paymentId: razorpay_payment_id 
                });
            }

            res.json({
                msg: "success",
                status: "Payment verified successfully!"
            });
        } else {
            res.status(400).json({ message: "Invalid Signature" });
        }
    } catch (error) {
        console.error("Razorpay Verification Error:", error);
        res.status(500).json({ message: "Payment Verification failed." });
    }
};

module.exports = { createOrder, verifyPayment, getConfig };
