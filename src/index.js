export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    // Default to index.html for root path
    if (pathname === '/') {
      pathname = '/index.html';
    }

    // API: Send Email
    if (pathname === '/api/send-email' && request.method === 'POST') {
      try {
        const data = await request.json();
        const { to, subject, body, smtp } = data;

        // Use MailChannels to send email from Cloudflare
        const send_request = new Request("https://api.mailchannels.net/tx/v1/send", {
          "method": "POST",
          "headers": { "content-type": "application/json" },
          "body": JSON.stringify({
            "personalizations": [{ "to": [{ "email": to }] }],
            "from": {
              "email": smtp.user,
              "name": smtp.from_name,
            },
            "subject": subject,
            "content": [{ "type": "text/html", "value": body }],
          }),
        });

        const res = await fetch(send_request);
        if (res.ok) {
          return new Response("OK", { status: 200 });
        } else {
          const errText = await res.text();
          return new Response(errText, { status: res.status });
        }
      } catch (e) {
        return new Response(e.message, { status: 500 });
      }
    }

    try {
      // Try to get the file from the static assets
      const response = await env.ASSETS.fetch(request.clone());
      return response;
    } catch (error) {
      // If file not found, try serving index.html for SPA routing
      try {
        const indexResponse = await env.ASSETS.fetch(new Request(new URL('/index.html', url).toString(), request));
        return new Response(indexResponse.body, {
          status: 200,
          headers: indexResponse.headers,
        });
      } catch (fallbackError) {
        // Return 404 if index.html also doesn't exist
        return new Response('Not Found', { status: 404 });
      }
    }
  },
};
