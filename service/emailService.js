const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const EmailService = {
    async sendWelcomeEmail(userEmail, userName) {
        const msg = {
            to: userEmail,
            from: 'xonga73@gmail.com', // Coloque o e-mail de origem desejado
            subject: 'Bem-vindo ao Sarará BarChef!',
            html: `
               <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #FF8C00;">Bem-vindo, ${userName}!</h2>
    
    <p>É um prazer tê-lo conosco no <strong>Sarará BarChef</strong>! A partir de agora, você terá acesso ao nosso sistema exclusivo, onde poderá gerenciar seus pedidos, acompanhar históricos e explorar uma nova experiência de bar digital.</p>
    
    <h3 style="color: #FF8C00;">Pronto para começar?</h3>
    <p>Por segurança, sugerimos que você redefina sua senha ao acessar pela primeira vez.</p>

    <hr style="border: none; height: 1px; background-color: #FF8C00; margin: 20px 0;" />

    <p><strong>Sobre o Sarará BarChef:</strong></p>
    <p>O Sarará BarChef é um aplicativo criado para transformar a gestão de bares e a experiência de seus clientes. Desde 2001, temos facilitado o gerenciamento de produtos, pedidos e inventário, permitindo que nossos parceiros elevem a experiência de seus clientes com praticidade e inovação.</p>
    
    <a href="https://barchef-sarara.vercel.app/login" style="display: inline-block; margin: 20px 0; padding: 12px 24px; color: #fff; background-color: #FF8C00; text-decoration: none; border-radius: 4px; font-weight: bold;">Acessar Sarará BarChef Web</a>

    <p>Atenciosamente,</p>
    <p>Equipe Sarará BarChef</p>
</div>

            `
        };
        await sgMail.send(msg);
    }
};

module.exports = EmailService;
