const { zodResolver } = require('@hookform/resolvers/zod');
const z = require('zod');

const registerSchema = z.object({
  email: z.string().min(1, 'O e-mail é obrigatório').email('Formato de e-mail inválido'),
  password: z.string()
    .min(1, 'A senha é obrigatória')
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .refine((val) => /[A-Z]/.test(val), { message: 'A senha deve conter pelo menos uma letra maiúscula' })
    .refine((val) => /[0-9]/.test(val), { message: 'A senha deve conter pelo menos um número' })
    .refine((val) => /[^A-Za-z0-9]/.test(val), { message: 'A senha deve conter pelo menos um caractere especial' }),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

async function test() {
  const resolver = zodResolver(registerSchema);
  
  // Simulate empty submit
  console.log('--- Empty submit ---');
  const emptyResult = await resolver(
    { email: '', password: '', confirmPassword: '' },
    {},
    { fields: { email: {}, password: {}, confirmPassword: {} }, shouldUseNativeValidation: false }
  );
  console.log(JSON.stringify(emptyResult));
  
  // Simulate valid submit
  console.log('\n--- Valid submit ---');
  const validResult = await resolver(
    { email: 'test@example.com', password: 'TestPass1!', confirmPassword: 'TestPass1!' },
    {},
    { fields: { email: {}, password: {}, confirmPassword: {} }, shouldUseNativeValidation: false }
  );
  console.log(JSON.stringify(validResult));
}

test().catch(console.error);
