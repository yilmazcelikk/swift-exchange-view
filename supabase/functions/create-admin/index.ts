import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if admin already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const adminExists = existingUsers?.users?.some(u => u.email === 'admin@hotmail.com')

    if (adminExists) {
      return new Response(JSON.stringify({ message: 'Admin already exists' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create admin user
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@hotmail.com',
      password: '2791859s',
      email_confirm: true,
      user_metadata: { full_name: 'Admin' },
    })

    if (error) throw error

    // Assign admin role
    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
      user_id: user.user.id,
      role: 'admin',
    })

    if (roleError) throw roleError

    return new Response(JSON.stringify({ message: 'Admin created successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
