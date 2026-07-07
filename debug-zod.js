const core = require('zod/v4/core');
const z = require('zod');

const schema = z.object({
  email: z.string().min(1, 'obrigatorio').email('invalido'),
  password: z.string().min(8, 'min8')
});

console.log('Schema has _zod:', '_zod' in schema);
console.log('Schema has _def:', '_def' in schema);
console.log('ZodError:', typeof core.$ZodError);

try {
  core.parse(schema, { email: '', password: '' });
} catch(err) {
  console.log('Error type:', err.constructor.name);
  console.log('Is ZodError:', err instanceof core.$ZodError);
  console.log('Issues:', JSON.stringify(err.issues));
}
