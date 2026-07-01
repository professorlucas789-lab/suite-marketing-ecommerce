import { z } from 'zod'

export const signUpSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não correspondem',
  path: ['confirmPassword'],
})

export const signInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export const productSchema = z.object({
  name: z.string().min(1, 'Nome do produto é obrigatório').max(255),
  category: z.string().min(1, 'Categoria é obrigatória').max(100),
  supplier: z.string().max(255).optional().default(''),
  costOfPurchase: z.coerce.number().min(0, 'Custo deve ser positivo'),
  transportCost: z.coerce.number().min(0, 'Custo deve ser positivo').default(0),
  packagingCost: z.coerce.number().min(0, 'Custo deve ser positivo').default(0),
  otherCosts: z.coerce.number().min(0, 'Custo deve ser positivo').default(0),
  desiredMargin: z.coerce.number()
    .min(0, 'Margem deve ser entre 0 e 99.99%')
    .max(99.99, 'Margem deve ser entre 0 e 99.99%'),
  notes: z.string().max(1000).optional().default(''),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type ProductInput = z.infer<typeof productSchema>
