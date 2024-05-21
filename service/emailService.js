const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const EmailService = {
  // Função para enviar e-mails de boas-vindas
  async sendWelcomeEmail(userEmail, userName) {
    if (!userEmail || !userName) {
      throw new Error('userEmail e userName são parâmetros necessários');
    }

    try {
      const msg = {
        to: userEmail,
        from: 'xonga73@gmail.com', // substitua pelo seu e-mail verificado no SendGrid
        subject: 'Bem-vindo ao Baravá - Seu aplicativo de gerenciamento do bar!',
        html: `
          <html>
            <head>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  background-color: #f8f8f8;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  border: 1px solid #ccc;
                  border-radius: 5px;
                  background-color: #fff;
                }
                h1 {
                  color: #333;
                }
                p {
                  color: #666;
                }
                .button {
                  display: inline-block;
                  padding: 10px 20px;
                  background-color: #007bff;
                  color: #fff;
                  text-decoration: none;
                  border-radius: 5px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Bem-vindo ao Baravá!</h1>
                <p>Olá ${userName},</p>
                <p>Parabéns por se cadastrar no Baravá! Estamos animados para tê-lo(a) como parte da nossa comunidade.</p>
                <p>O Baravá é o seu aplicativo de gerenciamento do bar, onde você pode controlar estoque, pedidos, e muito mais.</p>
                <p>Clique no botão abaixo para fazer login e começar a usar o Baravá agora mesmo:</p>
                <a href="http://localhost:7777/login" class="button">Fazer Login</a>
                <p>Se precisar de ajuda ou tiver alguma dúvida, não hesite em nos contatar.</p>
                <p>Atenciosamente,<br>Equipe do Baravá</p>
              </div>
            </body>
          </html>
        `
      };

      await sgMail.send(msg);
      console.log('Email de boas-vindas enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar o e-mail de boas-vindas:', error);
      throw error;
    }
  },

  // Função para enviar e-mails de redefinição de senha
  async sendPasswordResetEmail(userEmail, resetToken) {
    if (!userEmail || !resetToken) {
      throw new Error('userEmail e resetToken são parâmetros necessários');
    }

    try {
      const msg = {
        to: userEmail,
        from: 'xonga73@gmail.com', // substitua pelo seu e-mail verificado no SendGrid
        subject: 'Redefinição de senha',
        text: `Olá,\n\nVocê solicitou a redefinição de senha. Clique no link abaixo para redefinir sua senha:\n\nhttp://localhost:7777/reset-password?token=${resetToken}\n\nSe você não solicitou esta redefinição, ignore este e-mail.\n\nAtenciosamente,\nEquipe do Baravá`
      };

      await sgMail.send(msg);
      console.log('Email de redefinição de senha enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar o e-mail de redefinição de senha:', error);
      throw error;
    }
  }
};

module.exports = EmailService;
