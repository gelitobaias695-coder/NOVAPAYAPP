import nodemailer from 'nodemailer';

async function run() {
    try {
        console.log("Gerando conta de testes do Ethereal (provedor de emails temporário)...");
        // Generate test SMTP service account from ethereal.email
        const testAccount = await nodemailer.createTestAccount();

        // create reusable transporter object using the default SMTP transport
        const transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user, // generated ethereal user
                pass: testAccount.pass, // generated ethereal password
            },
        });

        const senderName = "NovaPay Testes";
        const senderEmail = testAccount.user;
        const testEmail = 'octaviojochua@gmail.com';

        const templates = [
            {
                subject: 'Seu Kit Caligrafia está sendo preparado! 📦 (Teste Físico)',
                bodyText: 'Olá <strong>Octavio</strong>, seu kit já entrou na nossa linha de produção. Logo você receberá o código de rastreio.',
                productName: 'Kit Caligrafia Master',
                primaryBtnText: 'Acompanhar Pedido',
                helpText: 'Precisa de ajuda? Fale com nosso suporte.',
                supportButtonText: 'CONTATO SUPORTE',
                isPT: true
            },
            {
                subject: 'Seu acesso chegou! 🚀 Curso Masterclass (Teste Digital)',
                bodyText: 'Olá <strong>Octavio</strong>, parabéns pela compra! Seu login e senha foram enviados para este e-mail. Clique abaixo para entrar na área de membros.',
                productName: 'Curso Masterclass',
                primaryBtnText: 'Acessar Área de Membros',
                helpText: 'Precisa de ajuda? Fale com nosso suporte.',
                supportButtonText: 'CONTATO SUPORTE',
                isPT: true
            }
        ];

        for (const [index, t] of templates.entries()) {
            const htmlTemplate = `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 40px 20px;">
                <div style="background-color: #121212; border-radius: 12px; padding: 0; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
                    
                    <img src="https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=800&auto=format&fit=crop" alt="${t.productName}" style="width: 100%; max-height: 250px; object-fit: cover; border-bottom: 2px solid #27272a; display: block;" />

                    <div style="padding: 40px;">
                        <h2 style="color: #ffffff; margin-top: 0; margin-bottom: 15px; font-size: 24px;">${t.subject.split('!')[0]}! 🎉</h2>
                        <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">${t.bodyText}</p>
                        
                        <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-top: 30px; text-align: left;">
                            <p style="color: #e4e4e7; margin: 0 0 10px 0; font-size: 14px;"><strong>Produto:</strong> ${t.productName}</p>
                            <p style="color: #e4e4e7; margin: 0 0 10px 0; font-size: 14px;"><strong>ID do Pedido:</strong> #TEST-${Math.floor(Math.random() * 10000)}</p>
                            <p style="color: #e4e4e7; margin: 0; font-size: 14px;"><strong>Total Pago:</strong> BRL 197.00</p>
                        </div>

                        <div style="margin-top: 35px;">
                            <a href="#" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 50px; font-weight: bold; font-size: 15px; display: inline-block;">
                                ${t.primaryBtnText}
                            </a>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7;">
                    <p style="color: #52525b; font-size: 14px; margin-bottom: 15px;">${t.helpText}</p>
                    <a href="mailto:suporte@novapay.co" style="background-color: #18181b; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block; text-transform: uppercase;">
                        ${t.supportButtonText}
                    </a>
                </div>

                <p style="text-align: center; color: #a1a1aa; font-size: 12px; margin-top: 20px;">
                    © ${new Date().getFullYear()} ${senderName}. Todos os direitos reservados.
                </p>
            </div>
            `;

            console.log("\n[Email] Enviando teste " + (index + 1) + "...");
            const info = await transporter.sendMail({
                from: '"' + senderName + '" <' + senderEmail + '>',
                to: testEmail,
                subject: t.subject,
                html: htmlTemplate
            });

            console.log("➡️ Enviado com sucesso!");
            console.log("🖼️ Clique aqui para ver como o email ficou (URL Mágica): %s", nodemailer.getTestMessageUrl(info));
        }

    } catch (err) {
        console.error("❌ Erro ao enviar os e-mails:", err.message);
    }
}

run();
