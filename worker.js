// subscription-verifier.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { email, plan } = await request.json()
    
    // Verify with Polar.sh API
    const response = await fetch('https://api.polar.sh/v1/subscriptions/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })

    const data = await response.json()
    
    if (data.isSubscribed) {
      // Create or update user in Supabase
      const { data: userData, error } = await createOrUpdateUser(email, plan)
      
      if (error) {
        throw new Error('Failed to create/update user')
      }
      
      return new Response(JSON.stringify({
        isSubscribed: true,
        user: userData
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({
      isSubscribed: false
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function createOrUpdateUser(email, plan) {
  // Create or update user in Supabase
  const response = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      plan,
      created_at: new Date().toISOString()
    })
  })
  
  return response.json()
}
