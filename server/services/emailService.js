import nodemailer from 'nodemailer';
import pool from '../db/pool.js';

export async function getTransporter() {
    const res = await pool.query('SELECT * FROM email_settings LIMIT 1');
    const settings = res.rows[0];

    if (!settings || !settings.smtp_host || !settings.smtp_pass) {
        throw new Error('Configurações de SMTP não definidas no sistema.');
    }

    return {
        transporter: nodemailer.createTransport({
            host: settings.smtp_host,
            port: settings.smtp_port || 587,
            secure: settings.smtp_port === 465,
            auth: {
                user: settings.smtp_user,
                pass: settings.smtp_pass,
            },
        }),
        senderName: settings.sender_name || 'NovaPay',
        senderEmail: settings.sender_email || 'noreply@novapay.co'
    };
}

export async function sendOrderConfirmation(orderId) {
    try {
        const orderRes = await pool.query(
            `SELECT o.*, p.name AS product_name, p.product_image_url, p.success_url,
                    p.email_sender_name AS p_sender_name, p.email_sender_email AS p_sender_email
             FROM orders o 
             JOIN products p ON o.product_id = p.id 
             WHERE o.id = $1`, [orderId]
        );

        if (orderRes.rowCount === 0) return;
        const order = orderRes.rows[0];

        if (!order.customer_email) {
            console.log(`[Email] Skipping receipt for ${orderId}, no email provided.`);
            return;
        }

        const { transporter, senderName: globalSenderName, senderEmail: globalSenderEmail } = await getTransporter();

        const senderName = order.p_sender_name || globalSenderName;
        const senderEmail = order.p_sender_email || globalSenderEmail;

        const lang = order.checkout_language || 'pt'; // can be 'pt', 'en', 'es', 'fr'
        const isPT = lang === 'pt';
        const firstName = order.customer_name ? order.customer_name.split(' ')[0] : (isPT ? 'Cliente' : 'Customer');
        const isPhysical = order.checkout_type === 'physical';
        const productImage = order.product_image_url || 'https://via.placeholder.com/600x300?text=Produto+Confirmado';
        const supportEmail = 'suporte@novapay.co';

        let subject = '';
        let bodyText = '';
        let helpText = '';
        let supportButtonText = '';
        let primaryBtnText = '';

        let productLabel = 'Product';
        let orderIdLabel = 'Order ID';
        let totalPaidLabel = 'Total Paid';
        let allRightsLabel = 'All rights reserved.';

        if (lang === 'pt') {
            if (isPhysical) {
                subject = `Seu ${order.product_name} está sendo preparado! 📦`;
                bodyText = `Olá <strong>${firstName}</strong>, seu kit já entrou na nossa linha de produção. Logo você receberá o código de rastreio.`;
                primaryBtnText = 'Acompanhar Pedido';
            } else {
                subject = `Seu acesso chegou! 🚀 ${order.product_name}`;
                bodyText = `Olá <strong>${firstName}</strong>, parabéns pela compra! Seu login e senha foram enviados para este e-mail. Clique abaixo para entrar na área de membros.`;
                primaryBtnText = 'Acessar Área de Membros';
            }
            helpText = 'Precisa de ajuda? Fale com nosso suporte.';
            supportButtonText = 'CONTATO SUPORTE';
            productLabel = 'Produto'; orderIdLabel = 'ID do Pedido'; totalPaidLabel = 'Total Pago'; allRightsLabel = 'Todos os direitos reservados.';
        } else if (lang === 'es') {
            if (isPhysical) {
                subject = `¡Tu ${order.product_name} está siendo preparado! 📦`;
                bodyText = `Hola <strong>${firstName}</strong>, tu pedido ya ha entrado en nuestra línea de producción. Pronto recibirás el código de seguimiento.`;
                primaryBtnText = 'Rastrear Pedido';
            } else {
                subject = `¡Tu acceso ha llegado! 🚀 ${order.product_name}`;
                bodyText = `Hola <strong>${firstName}</strong>, ¡felicidades por tu compra! Tu inicio de sesión y contraseña han sido enviados a este correo electrónico. Haz clic abajo para entrar al área de miembros.`;
                primaryBtnText = 'Acceder al Área de Miembros';
            }
            helpText = '¿Necesitas ayuda? Contacta a nuestro soporte.';
            supportButtonText = 'CONTACTAR SOPORTE';
            productLabel = 'Producto'; orderIdLabel = 'ID del Pedido'; totalPaidLabel = 'Total Pagado'; allRightsLabel = 'Todos los derechos reservados.';
        } else if (lang === 'fr') {
            if (isPhysical) {
                subject = `Votre ${order.product_name} est en cours de préparation ! 📦`;
                bodyText = `Bonjour <strong>${firstName}</strong>, votre commande est désormais dans notre file d'attente d'expédition. Vous recevrez bientôt votre code de suivi.`;
                primaryBtnText = 'Suivre la Commande';
            } else {
                subject = `Accès accordé ! 🚀 ${order.product_name}`;
                bodyText = `Bonjour <strong>${firstName}</strong>, félicitations ! Vos identifiants de connexion ont été envoyés à cet e-mail. Cliquez ci-dessous pour accéder à l'espace membre.`;
                primaryBtnText = 'Accéder à l\'Espace Membre';
            }
            helpText = 'Besoin d\'aide ? Contactez notre support.';
            supportButtonText = 'CONTACTER LE SUPPORT';
            productLabel = 'Produit'; orderIdLabel = 'N° de Commande'; totalPaidLabel = 'Total Payé'; allRightsLabel = 'Tous droits réservés.';
        } else {
            // 'en' default
            if (isPhysical) {
                subject = `Your ${order.product_name} is being prepared! 📦`;
                bodyText = `Hi <strong>${firstName}</strong>, your kit is now in our shipping queue. You will receive your tracking code shortly.`;
                primaryBtnText = 'Track Order';
            } else {
                subject = `Access granted! 🚀 ${order.product_name}`;
                bodyText = `Hi <strong>${firstName}</strong>, congratulations! Your login details have been sent to this email. Click below to access the members area.`;
                primaryBtnText = 'Access Members Area';
            }
            helpText = 'Need help? Contact our support team.';
            supportButtonText = 'CONTACT SUPPORT';
        }

        // Botões do email (links devem estar no atributo `href`)
        const baseUrl = process.env.VITE_APP_URL || process.env.FRONTEND_URL || 'https://novapay.co';
        const productLink = order.success_url || `${baseUrl}/checkout/sucesso?order_id=${orderId}`;
        const supportEmailLink = `mailto:${supportEmail}`;

        const htmlTemplate = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 40px 20px;">
            <div style="background-color: #121212; border-radius: 12px; padding: 0; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
                
                <!-- Product Image Banner -->
                <img src="${productImage}" alt="${order.product_name}" style="width: 100%; max-height: 250px; object-fit: cover; border-bottom: 2px solid #27272a; display: block;" />

                <div style="padding: 40px;">
                    <h2 style="color: #ffffff; margin-top: 0; margin-bottom: 15px; font-size: 24px;">${subject.split('!')[0]}! 🎉</h2>
                    <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">${bodyText}</p>
                    
                    <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-top: 30px; text-align: left;">
                        <p style="color: #e4e4e7; margin: 0 0 10px 0; font-size: 14px;"><strong>${productLabel}:</strong> ${order.product_name}</p>
                        <p style="color: #e4e4e7; margin: 0 0 10px 0; font-size: 14px;"><strong>${orderIdLabel}:</strong> #${order.id.split('-')[0].toUpperCase()}</p>
                        <p style="color: #e4e4e7; margin: 0; font-size: 14px;"><strong>${totalPaidLabel}:</strong> ${order.currency} ${parseFloat(order.amount).toFixed(2)}</p>
                    </div>

                    <div style="margin-top: 35px;">
                        <a href="${productLink}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 50px; font-weight: bold; font-size: 15px; display: inline-block;">
                            ${primaryBtnText}
                        </a>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7;">
                <p style="color: #52525b; font-size: 14px; margin-bottom: 15px;">${helpText}</p>
                <a href="${supportEmailLink}" style="background-color: #18181b; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block; text-transform: uppercase;">
                    ${supportButtonText}
                </a>
            </div>

            <p style="text-align: center; color: #a1a1aa; font-size: 12px; margin-top: 20px;">
                © ${new Date().getFullYear()} ${senderName}. ${allRightsLabel}
            </p>
        </div>
        `;

        await transporter.sendMail({
            from: `"${senderName}" <${senderEmail}>`,
            to: order.customer_email,
            subject: subject,
            html: htmlTemplate
        });

        console.log(`[Email] Receipt dispatched to ${order.customer_email} for order ${order.id}`);

    } catch (err) {
        console.error(`[Email] Failed to send order confirmation:`, err.message);
    }
}

export async function sendTestEmail(toEmail) {
    const { transporter, senderName, senderEmail } = await getTransporter();

    await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: toEmail,
        subject: `NovaPay - Teste de Configuração SMTP ✅`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; text-align: center;">
                <h2>A conexão SMTP está funcionando perfeitamente! 🚀</h2>
                <p>Seus clientes já podem receber e-mails transacionais e recibos da NovaPay.</p>
            </div>
        `
    });
}
