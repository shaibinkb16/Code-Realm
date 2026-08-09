import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
from app.core.logging import logger

def send_otp_email(to_email: str, otp: str):
    """Sends a 6-digit OTP to the user's email."""
    if not settings.SMTP_USER or not settings.SMTP_PASS:
        logger.warning(f"SMTP not configured! OTP for {to_email} is {otp}. Proceeding without email dispatch.")
        return

    subject = "Your Code Realm Authentication Code"
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #0A0A0A; color: #FFFFFF; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #141414; padding: 30px; border-radius: 8px; border: 1px solid #1F1F22;">
          <h2 style="color: #FFFFFF; text-align: center;">Welcome to Code Realm</h2>
          <p style="color: #A1A1AA; text-align: center;">Use the following 6-digit code to verify your identity.</p>
          <div style="background-color: #000000; padding: 20px; border-radius: 4px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #10B981;">{otp}</span>
          </div>
          <p style="color: #71717A; font-size: 12px; text-align: center;">This code will expire in 5 minutes.</p>
        </div>
      </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email

    part = MIMEText(html_content, "html")
    msg.attach(part)

    try:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
        server.quit()
        logger.info(f"OTP email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {str(e)}")
        # Don't raise so we don't break registration if email fails temporarily
