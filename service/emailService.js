const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const EmailService = {
    async sendWelcomeEmail(userEmail, userName, password) {
        const msg = {
            to: userEmail,
            from: 'xonga73@gmail.com', // Coloque o e-mail de origem desejado
            subject: 'Bem-vindo ao Sarará BarChef!',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #E91E63;">Bem-vindo, ${userName}!</h2>
                    
                    <p>É um prazer tê-lo conosco no <strong>Sarará BarChef</strong>! A partir de agora, você terá acesso ao nosso sistema exclusivo, onde poderá gerenciar seus pedidos, acompanhar históricos e explorar uma nova experiência de bar digital.</p>
                    
                    <h3 style="color: #333;">Aqui estão suas credenciais de acesso:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li><strong>Usuário:</strong> ${userName}</li>
                        <li><strong>Senha:</strong> ${password}</li>
                    </ul>

                    <p>Lembre-se de manter essas informações seguras e confidenciais.</p>
                    
                    <hr style="border: none; height: 1px; background-color: #E91E63; margin: 20px 0;" />

                    <p><strong>Sobre o Sarará BarChef:</strong></p>
                    <p>O Sarará BarChef é um aplicativo criado para transformar a gestão de bares e a experiência de seus clientes. Desde 2001, temos facilitado o gerenciamento de produtos, pedidos e inventário, permitindo que nossos parceiros elevem a experiência de seus clientes com praticidade e inovação.</p>

                    <p>Atenciosamente,</p>
                    <p>Equipe Sarará BarChef</p>
                </div>
            `
        };
        await sgMail.send(msg);
    }
};

module.exports = EmailService;
