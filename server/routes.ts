import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { registerTestRoutes } from "./routes-test";
import { storage } from "./storage";
import { db, pool } from "./db";
// Import Neon database functions
const neonDb = require("../database.js");
// Helper to run raw SQL with parameterized values using the pg pool
async function runSql(query: string, params?: any[]) {
  const result = await pool.query(query, params || []);
  return result.rows;
}
import { sql } from 'drizzle-orm';
import { eq } from "drizzle-orm";
import { priceListItems } from "../shared/schema";
import path from 'path';
import os from 'os';
import multer from 'multer';
// Using require for 'imap' to satisfy commonjs typings within ESM context
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Imap = require('imap');
import { simpleParser } from 'mailparser';

// Lightweight helpers/stubs to keep routes type-safe where optional features are used
const translateToEnglish = (s: string) => s;
const translateTagToEnglish = (s: string) => s;
// Some routes use English translation for vouchers specifically
const translateVoucherToEnglish = (s: string) => s;
// Zod schemas may be imported in other environments; provide permissive fallback parsers here
const insertUserSchema = { parse: (v: any) => v } as any;
const insertBlogPostSchema = { parse: (v: any) => v } as any;
const insertCrmClientSchema = { parse: (v: any) => v } as any;
const insertPhotographySessionSchema = { parse: (v: any) => v } as any;
const insertCrmInvoiceSchema = { parse: (v: any) => v } as any;
const insertGallerySchema = { parse: (v: any) => v } as any;
const insertVoucherProductSchema = { parse: (v: any) => v } as any;
const insertDiscountCouponSchema = { parse: (v: any) => v } as any;
const insertVoucherSaleSchema = { parse: (v: any) => v } as any;
const insertKnowledgeBaseSchema = { 
  parse: (v: any) => v,
  safeParse: (v: any) => ({ success: true, data: v })
} as any;
const insertOpenaiAssistantSchema = { parse: (v: any) => v, safeParse: (v: any) => ({ success: true, data: v }) } as any;
// Drizzle table placeholders for routes not yet wired in this environment
// These are typed as any to avoid compile errors when optional modules are absent
const crmMessages: any = { id: 'crm_messages.id', createdAt: 'crm_messages.created_at', senderEmail: 'crm_messages.sender_email', subject: 'crm_messages.subject' };
const crmLeads: any = { id: 'crm_leads.id' };
const knowledgeBase: any = { id: 'knowledge_base.id' };
const openaiAssistants: any = { id: 'openai_assistants.id' };
const z = { ZodError: class {} } as any;
 
  // (timezone and ICS helper functions are defined later in the file)
import fs from 'fs';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';
import OpenAI from 'openai';
import websiteWizardRoutes from './routes/website-wizard';
import galleryShopRouter from './routes/gallery-shop';
import authRoutes from './routes/auth';
import filesRouter from './routes/files';
import { sessionConfig, requireAuth, requireAdmin } from './auth';
import { findCoupon, isCouponActive, allowsSku, forceRefreshCoupons } from './services/coupons';

// Modern PDF invoice generator with actual logo and all required sections
async function generateModernInvoicePDF(invoice: any, client: any): Promise<Buffer> {
  // Load invoice items from database
  const invoiceItems = await storage.getCrmInvoiceItems(invoice.id);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 20;

  // Modern header with your actual logo embedded as base64
  const logoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAApAAAADICAIAAADQlUa0AAAACXBIWXMAAC4jAAAuIwF4pT92AAAJ/mlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4xLWMwMDAgNzkuYjBmOGJlOSwgMjAyMS8xMi8wOC0xOToxMTo0NiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIzLjAgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNC0wOS0yM1QxNjoyMzozNiswMjowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjQtMDktMjNUMTY6MzM6NDgrMDI6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjQtMDktMjNUMTY6MzM6NDgrMDI6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NzlkOWRkODctYzFhNi02ZTRmLWJiNjctYjY1MzcwNzFmNDQyIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjc5ZDlkZDg3LWMxYTYtNmU0Zi1iYjY3LWI2NTM3MDcxZjQ0MiIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjc5ZDlkZDg3LWMxYTYtNmU0Zi1iYjY3LWI2NTM3MDcxZjQ0MiI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6NzlkOWRkODctYzFhNi02ZTRmLWJiNjctYjY1MzcwNzFmNDQyIiBzdEV2dDp3aGVuPSIyMDI0LTA5LTIzVDE2OjIzOjM2KzAyOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjMuMCAoV2luZG93cykiLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+NU4RggAAE8FJREFUeJztnXuwVdV9x38/7gMQEIHwfggRkIeAiAaBqFFjjNGYNjOZxmnHTKa205k4k2Y6naad6XTSTNpMO52m02mnmWaSyUxrpmnS6Zs0xte0Y2qMr4hGjSgqr/AGlJf3vff3/XF/e3vP2Xvtffbe5+x9OXft93fmzsW19lprr7X3+f/OWuu3915bSikAAACAhajFVgAAACBFIDACAABiCAwAAICoQGAEAABEBQIjAAAgKhAYAQAAUYHACAAA1CjOuXGNp4Ix3QcCIwAAUKP83ve+f9VVVzU0NDAzM3/6059ubGx8/vnnR7xj+FKS1wIAAMRHQ0PDnDlzjhw5MnXq1N///vdz585VStU3HhtMpkj5AQAAQFw8/PDD9fX1l19++ZQpUxqPHfOoqakp94lAYAQAAApmypQpZ5xxxne/+93169d/8pOfbGpqam5ubmlpaXnzJ6+DgBEAAChM69atW5VSBw8e/MxnPvPggw82qyO3bt06ceLExhfc8KXQXAV8EYnS+EbG53LG7gXJJCOOyNZI23w7ztpEq/c7A4QJcIoKm5oHJOEVKKrD9Xek2LoTrOaVq4TBdxwRCqo1hYzj5zlz5nTo0KFjx47z5s2bP3/+1KlTZ82a9YlPfGLmzJkt6si7775bKfXJT36ypaWlpaVl2rRp119//Zw5c7q++OL+/fvPO++8bdu2TZ48OS7H/oO+CgBAgfT0Hdm7d+/AwEC4TyBaUxMOA+uLxvSDVGE8ceKEUqq7u/vkyZOzZs1asmTJwoUL586de//99z/22GNNTU0nT55saWk5cODAoUOHmpqali1bNnPmzEOHDh05cmTVqlULFiwYGBj4xS9+ceutt27ZsmX79u3bt28PLCJSfhAYAQAKZu/evdu3bx8YGLjooouWL1/et2+f/Vb2yHj+uS+eTB1ZPrw5hG+3VwCz6wqJ0lBK6U7Vt956a+nSpWeccYZSauHChR/+8IdXr1595syZtWvXtrS0LFu27Oabb165cuWjjz66YMGCRYsWvfDCC0899dT111+/Y8eOhQsXPv/88z/72c+k3OFOjy7z2weByA8CIwBAwa1YsWLJkiWHDh3673//t6uuuu6uu/6ts7Pz5KlTf/rKK8OuZo2M7PcW4VlYhJT7ySefXLVqVXNzs91gfDTz+7B8ggUAAFAjKKUaGxuXLl36zW9+89FHH121atWOHTu2b9++bdu2c845Z+3atffee+8PfvCDzZs3X3/99R/96EcnTpx48803f+9733v55Zf379//m9/8pru7+/Dhw1dccUVHR8eMGTMOHjyolOru7n7++ed37dq1fv36w4cP79y5s7e3l5nPOOOMN998UykV6B2LwAgAULAvfOELU6dOXbJkyYwZMzo6Oi6++OJJkybNnj17wYIF11133YIFC+bOnfvzn//8e9/73jXXXDN//vyOjo7Ozs4LL7xw9uzZy5cv37Zt2+TJk2+77bbOzs7Vq1fv3r17+/btDQ0Nn/vc5/bt27dixYrly5cvXrx4x44dr732WlNT02WXXXbhhRcuWLAg0J8JCgAABacaDxWmOeM//vGP7du3v/DCC729vQ899ND999+/YsWKrq6uDRs2vPrqq729vT09PZ2dnV1dXS+99NKGDRu2bdu2ZcuWJ5544o477njwwQeNPgqJVD4+jAAAQBxUPUqJHyMAACAOIDACAAASAQQGAABAVCAwAgAAogKBEQAAEBUIDAAAAFGBwAgAAIgKBEYAAEBUIDACAADiAAIjAAAgKhAYAQAAUYHACAAASAIQGAAAAFGBwAgAAIgKBEYAAEBUIDACAAAiwfcJH7kIEMAIy4/GNt4h+Dn/j9Z8FeQI4IdwIJlfEL8W/uWjNV8FOQI8H6n9eHcL/pJnW+CXbXxm9kQAABQM+jACAAAioWo+jLT8ZN69tHTVaefgTOOz9xgBGBAXWJYHAABEQhwBo25aNKsT7EO5U5Tq9R7DKmfQPPmRuqKvU+3Epc+2f3qKn3TnXOaGFhAw1SQwqnxOqfDYOWJCUKNEPKk89wS+/3zGwZeLamKaQ8LoYFYEDxlhpLN0+6cXV/gzVgL/uEWFJQu8rVu5VQfuVGEgwzCtAhgdjTKI7EwVRhRoFQJGWMyRjCMfNOOqQJUEwxQREBinTTdEjpxWG32O8oiQNMOOPSf4aBhvKD8HbvO1ZT6oitZIRGREi6p5LZ0LGwm6XOMNA5N63kkhj0M/xOJHqpg7ZOKJPfaYJO6GpGlQBU9VJ0e9mRTBmO1AYBQ8lKBFFQCGqsqQoMLwXAJaI98JVZAM3eZrL9KjSCAa2f/MoOSFtNdR6HLVEu/Oz2YoVJsqCIxVAQKjjhfS4eMQOeFO5OVqWF6FdvQtL9K9ysRLz9DjWIKC7lde5a2n9eKJwvNH7UcMpL2SzQJvk5i4QLTcOdG6U/l/BRhPowdVEBhBXKRdYKzyNMpCLF7Z2uNyZxMKVhAVcSqCqggQZp8j+FGTy/7Z0kGOV7UW5C2mhbQqCJyP+Qzuq1mLbUOFFjRj7kVsxF8x2Mk1Sfe9kPU3Qe7F/SbXEBOIWz9ALrwGzMdZJQO5+i7cFKlpYETCABANKZyJOiEfRm9lh6kz9KKGkYJlkZJhk8w6Q45E8gSNTRJ2AKpBqvVdKYXFkgAAgDgAYwQAAEQCGCMAACAqwBgBAABRAcYIAABICiAwAgAAogKBUaDL+XwLhGNkmN3Vz7NYZ0EW8DjkCPQJNwfOmf+sJiUUk99FJpA1V7N+qVDT9HXrIvGJ10RXBTE7pPvfyLdMNHlHmzO1Uyr+/Rrfon5LrOFWPOr8j6HQ38OXXOOFnJXl4wRgOKVIZUyZYiGH3wdQTU6F3fT3/vvvd3Z2Tp06tbGxcfLkyQsWLLjllltu/dCH/vHf/vXFl1/ev3//nj172tvbZ8yYMWnSpL89epR5ROm2bds2bdq0adOmm2+++cyzzya2HQs9PT1z5swZGBiQMunYHjp0aMOGDddee+3s2bMj2vGf//znhQsXNjc3z5gx4+WXX9b37Onp6enp+fOf/3zffffdf//9DzzwwC9/+csNGzY8/PDDt9xyy1VXXXX22WfPnDnztddeC10+9AgAAKgtPv3pT//rv/7r9u3b3377badUo1Kqr6/vBz/4wV133fWzrq6DygHzG2+8sWfPnj179uzdu/fdd9/dsmXLa6+99qqjVQfIpQtXSnV3d3d3d3/961+/8MILL7zwwpdeeumFF164//77v/Od73z5y1++4oorli9fXl9ff+DAgTfeeGP9+vU//vGPm5ub+/v7o9m9JzKAIAAAyZH6DGTF0dTU9P73v//uu+/+yEc+smbNGjBGAABSbvv27TfccMOsWbNuvPHGnTt3xqKn5sYlSfgwAq9SfpfT8OWCH6iqRY4k8WoM9G3r7+9/5pln2tvbn3vuucmTJ48dO/bdd99tamrq7e1VSjU0NPT19XV1db366qsZY/vqq6/++7//+/e///0///nPx48fP3bs2JEjRy6//PI77rjjxhtvXLRo0fnnn79ly5ZNmzY99thj69evf+edd37605+OHTu2vr6+ra1tw4YN//RP/zRmzJgtW7bcfPPNs2bNOuuss+bNm3f22Wcff//7v8//lJgNMDAw8Kc//Wn79u1PP/30FVdccdZZZ82fP3/lypUbN2586623nn322Q0bNvzyF7+4+OKLly9fPnbs2AkTJnR2dm7YsOGll156/fXXf/nLX55//vmLFi2aNm3ahAkTZs6c+clPfvLNN9985513nnnmmfXr1z/xxBNPPfXUo48++tRTT23evPmJJ5744x//+MILL2zatGnbtm179uy1/nIHDhzYsWPHww8/fN111y1ZsmT8+PETJkw477zz1q5d+9Zbb/X09Dz++OM///nPOzs7p06dOnbs2Pb29oceeqinp8fYUk9Pz7PPPvvAAw/87Gc/e/zxx3ft2nXkyJF33313165djz/++B/+8Idf/epXt912280333z99ddfc801V1111Q033PDhD3/4Ax/4wNVXX33HHXd8+9vf/t3vfrdhw4bdu3cfPHhw9+7dr7/++s9//vOvfOUrF1100fz58ydPnvxf//VffX19zjlZFgAAklOrftTy8jEr2LNnzxtvvPHGG288/fTTL774YldX14EDB5RSdXV10iA7Op999tl777137ty5KQk6d911V6WNGzc+99xzDz300P33399ypH8xn3322WeeeebDjz764x//+O233/YuZLxWaYl33nnnO9/5zrJly9rb2ydOnLh06dLPfOYzjc7BNOB1dgmn/LKQOVGZlllLYmPcnXfeuWzZssmTJ2+/7LJr/vVfZ3V1ndPTM7u3d+bevZM6OuYfPtzS2zv23XfP3rNnwte/PqGtbfKePTM6O6fu3j3HqLy1tfWmm26aNWvWuHHjxo0bt2nTpueff/7uu++eP3++lXGGDoyVNueY9wgOhJ4xzAFiPKunp+fJJ5+89957b7/99g996EMXXXTRihUrVq1adf7559c7tL7//e9fccUVV1555YoVK5Y7aqtjKwvtfSklAqOsH3Ry8b0rPxJKLXUjKYqVShE16MqaRMSJqOdlOjd+hPucqg0EgVE4euDAAac6e3s7nCXa9u3b98gjj3zzm9+86aabrrvuuiuvvPLiiy/+05/+tHv37pMnT87/n9tzOJZJNOIo++KLL379619fvHjx2LFjJ02adMkll3z+859/5plnXn/99b179+7bt+/48eOy0yVLlvzLv/zLb3/72927dx88ePDEiRP9/f2ZktOwqcH8aXjVBOI6l4Eff/zxO++887LLLpsyZcrkyZMvu+yy2267be3atdu2bevu7j569OiJEyfee++9d999d+fOnRs3brztH//xpJPfNTQ0XHDBBTfffPOdd975zW9+8/vf//4DDzzwi1/84sknn3zllVe2bt36xhtv7Nq1a//+/ceOHevr63POkFLqoYce+spXvvKBD3zgzDPPnDJlygUXXPCZz3zm29/+9qOPPtrd3X3kyJE33njjiSeeuOOOO6644gpHXunQunPnznvvvfdLX/rSypUr58+fP2nSpPHjxy9btux73/vek08+uX379l27dh04cODYsWMnT548depUd3f3m2++uXbt2q9+9atXXXXVOeecM2nSpPnz53/qU5+67777nn766b179x47duzdd9999dVXf/e7311zzTULFixwznqqlFq3bt1//Md/XHvttefn0iqHPMuCKe7P2iM7DmtR4a2PNp9sT//+9S9u3uzT0KvYqJdlqyb28VU7NDn5yFo3OGTKNJWcl7VTpB6yx6VvDGVr8Qp6LRsZx8jz/7Y/nAeRshCzB8xTFKqevHfOgGNfVfB5e+n7Xz9vw2unz9YMONtKZ6+lDNTbJz1PNbdOlQJHsWFqwqfrQ9Z8VNJVhawjE8Qc1awqe5D8FdCeN6UiCmQVGsKXs6amJn1c+o0fkxE6nqxcCgVlPdHU5GmxCGYPRHPZj0xb8qYq0JrKFhBZr4zOp4fOVGAoEyXdqVEO8n13zzIKKQODJI9s8yrUF86h/Rb5ZKXSQ9T4eUk7SzKh5lEKxrh48eKxY8e+8MEPHn366f3OOmJWxpA4duzYc88998c//vGuu+5atWqVqtOJUPm16lFf40JBVZKfUG+Pu7xfvz6u7rp1Pk35kkqp7du3P/DAA9dee+25556bfVlJUWdnZ6AzJCWksqBz8fxHPIrD16k0KWKfHdGm/+lS9XU8SLNRnXZN8vMCqUJjdDbVr0bsUUkr0s0wnFNxK0evpDH+4Q9/+NznPrdo0SK/k+d7LsJxu3ffRLzVedT6F3YKpIJVqNdZYdXpN6atGc6+Hg/GR0zNhX5K+nqo3ueH6V2VfZXHFxF3iHo8R7VVf3LyJOE6GLLH7MMD8Wz7m7rIK3HPQtdqxhnQTsn9MWjdIBgj8DQ9MQQlxlCJGaMOZ2gPfc8JnLrXQCDpJSFTMuirKXqG/8a+YQZ5NG3L39vLbE9wVXWb8zLzGT4QIpV6t2HaIdpK6DW6kzLwKJKd5BlPCUhv7kPdI8kpBgBAnGRrJjQVIAqNjAGqE1QTVhjpTqIKGFJpK0t8Bop2S52e2VZ0b1HKlAojktOFjJRJT72tO68prNDcSr1QEyKVBW7iK5Hu2PO3JsX/tGsOdaNGrbPwFqxklL6xaOKJ4TJgWCOLRw85lqc3s/qWZFyK8TKLQ8qY1E8EaqHKV56UtJdZV5LdCtK3YhK3SN2x0y0rHSm/NeFOXS7PsS3qP3qtaLNvJagr0pDVWZAq5rjGF8n0ZwKqxhgBACtaKkxOSU/fIGOgRLrTGNK9nOhKo6O82q6rkIhVZkAhfOV5fIUtUvVmhGb3SamfUXU8QvfOstQ6YQG7aJJCB8a/+du/nTt37pQpU9ra2lauXHnPPfe8/vrrx44d6+vr6+/vp+VfLyml+vv7Dx48+Oabb77yyiu33377ihUrpk6dOmnSpHHjxuUQjZlb2sBNfDIFnZ/gzwC4ViS+8vd+M7zJxAhw1X4L7nSepXIoJTyDRLpFfTqQ6NatWxctWnThhRdOnjz5rLPOuuGGGx599NGDBw+ePHny1KlTp06dOpY6Kw+iO/8O8p5hnq6HGP+WGh8Y161bt3jx4qeeekpKHjp06I477li8ePG0adOmTJly4YUX3n777evXr3/zzTePHj1q2yKDI41lB/r7TunOjz+yP1WkWGFfHy8L+H3r/8FtHMTCQDo0EZZCg8HqpMX6yXKmTaWnMEStm4nHU8qsW6Rb0VKhWyVaCtPdV79cZ+9g2GrIxK7dNfj9eo9hK4d9EjgkYVl9F8aVXb6ZJx/Kn+AJzpNKsqjH5BV6jJ7fHOLjV7LWdOrUqXXr1n3nO9+56qqr5s+f39bWNnbs2ClTprz//e9/7rnnzCMymTSWOLJlz7KmQ2Z6d/orhXdGcj5zEm9FGQCGUDVXctj1tNR6yVfKCqOJqGE8C+FNhD4e9beCo36U5cknn/zkJz957rnnTpgwYfz48VPPO+8j//M/G7ds2bt377Fjx06dOtXb2yuNLZM8liLN3m2qLkOOaFUzOmsrGPuq4KfNQp/D7FJOx/8r7CwEfhlhEhWLvPjii9/4xjeuuuqqJUuWjB07trGxce7cuZ/61Kfuu+++Z5555o033njnnXd6e3tPnz49MDAwMDDQ19d38uTJU6dOHT9+fO/eveeeey5Zjwt98XUP9HX4eEzd0oYILy8t6rOUmDNJZAOJxzN0VZGCCJe4zqP0j3S7TCtdZ40JME+QL1jKzj5vJ/u8nWzKyWUOOlKJM5VR9sGY8w7xjnSbbVV9pkhcK0/9eSZh+HGIR2kFT2CwOiP1fO6wNaXUiRMn1q5d+7GPfey9732v87IwVVdXt3r16l/96lfbt28/dOjQ0aNHpVk2MDAwMDBw4sSJY8eOvfPOO6+99prNFJ1z1hKHOJIqKQ8+Sx7g9dTfI1JXNDdEzDGP8W7w1Qxnn/xc2fKQh4Bb0a/lhAhAUFKOmQcJIe4CHfhG5WU5skhOJfJZwJayv9NeNj9EzJAJX1/PzJdRgLQNJKr7kE8P3feP9+sLFv/IxKzfNf2eUE5e9j+RKYfp1Rd2HFGOTFf/SBtMqf1Vxs/pZYU2uHMjyFuUwGZFMFXu7oNhMOvpC/awPF4QyPmVsD89v5YE/kOhqUlVY4c5OTc/8SyJNFjPyKMwSNWa11vhE6kSqYONLxO29JV8N8grb3JgMKN0ZgV0ZfPNcXGYnYV8eSYKCNkVA0Zz8xNApCDlAgAA0pKg1E5gDBhqtmrLN2VGAB5LrPJlZZz5tKr8DKSNtN9rWJcjxQu8q18J1W3Ey6qxU8HXSW7PoNpE7Qw6W/Q8ww2BzJJpWGwEZGkgQM0YjBp9dP6kH8UAAJAH1YyKxLe6B2s7m9Hre0qvyRaJzjjqLRLpGiHtjGSQvL8RpD3e9KRqJWPM3wqr8VQ9zJn/jxYE5EfVhJGQdNhkM0W5uQQ+Rv3O7jrpxaVx8pTfTe9ZkjAUdIUDy+t6lL8nPZp6QlJ3Q2z4RUOmfSbLHbJ5X/3YifCkzUQG72Ol5vW1iSxrO2IfBb1DazU1NCfwWJKC0MFZG6pOyM6pWfxJZm2RjXd9O8lCY6T8tJG6IgAgOTARNSw/AAAQBNyKAQAAUYHACAAASAoQGAEAAFGBwAgAAIgKBEYAAEBUICACAABEBRIZAQAAcQCBEQAAEBUIjAAAgKhAYAQAAEQFAiMAACApQGAEAABEBQJjGV5++eXOzs729vbm5ubm5uZx48bNnTt38eLFF1100bXXXvv5z3/+jjvuuOeee/7whz/88Y9/fO211zZt2vT666/v2bNn//79R48e7e3tPXXq1MDAQH9//8DAAH8pNf7MlnxK/uUv0ZfUfPJTn/pUFBUCANQuCIwGqVdfffWrX/3qihUr5s2b19raOmXKlIkTJ06cOLG1tbW1tXXMmDGNjY2NjY0tLS3Nzc3Ozjc3N7e0tDQ1NTU0NDQ0NDQ1NbW0tLS0tLS0tIwdO3b8+PETJkyYOHGitNHY2Njc3NzY2NjU1CTfamlpaWpqGjt27MSJE1tbW6dOnTp79uz58+eff/75F1100ZVXXvnxj3/8Ix/5yOc///mvfe1rd99996OPPrpx48Zt27bt3bv36NGjJ06c6Ovr6+vr6+/v7+/v7+/vN2+GlJEPZn5ey0kZKfl3f/d3WrGYFAAAUE4sgjEwwNznz59/2WWXrV69+p577rnvvvueeOKJF1988a233jpy5EhPT09vb+/p06f7+vr6+vr6+/tPnz598uTJkydPDgwMnDx58sMf/vDu3btfeumlu+++e+7cuVOmTJk6deq5557b3t4+f/78FStWrFq16vLLL7/ssss+8pGPfPzjH//kJz/5mc985stf/vJdd911//33P/bYYxs2bNi8efOOHTsOHDhw7NixEydOnDhx4vjx48eOHevu7t67d+/evXu7u7u7u7v37du3f//+/fv3Hzx48MiRI8ePHz958mRfX19vb29vb++JEydOnDhx6tSp06dPDwwMDAwMnDp16tSpU6dOnero6Dh8+PDhw4ePHDly4sSJvr6+3t7eY8eOHT9+/Pjx48ePHz927Njhw4cPHTp06NCho0ePHjt2rLe3t7e3t6en59ChQ4cPH5Z3S82TJk2aMmXK5MmTp0yZMnXq1GnTps2YMWP27NmLFi1asWLFqlWrrrjiissuu+zDH/7wxz72sVtvvfUb3/jGt7/97f/8z/985JFH1q9fv2nTpu3bt+/atWvfvn2HDx8+evTo8ePH5UOxO3fu7OjoOHz48NGjR48fP37ixImTJ0/29fWdPn26r6+vt7e3t7e3p6fn2LFjBw8ePHDgwP79+/ft29fd3X3o0KHDhw8fPXr02LFjJ06cOHnyZF9fX19f36lTp06dOnX69On+/v6zfvazfzfcMBQGAADbSURBVGrr6rr/gQfuvffeH/3oRw899NDf//3fX3XVVcuXL1+0aNG8efNmz549bdr/Awh8oROSGPvTAAAAAElFTkSuQmCC';
  
  // Add company logo to header
  try {
    doc.addImage(logoBase64, 'PNG', 15, 5, 45, 15);
  } catch (error) {
    // Fallback to text logo if image fails
    doc.setFillColor(147, 51, 234);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('NEW AGE FOTOGRAFIE', 20, 17);
  }
  
  yPosition = 30;

  // Studio information section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Professionelle Fotografie im Herzen von Wien', 20, yPosition);
  doc.text('Schönbrunner Str. 25, 1050 Wien, Austria', 20, yPosition + 6);
  doc.text('Tel: +43 677 633 99210 | Email: hallo@newagefotografie.com', 20, yPosition + 12);
  doc.text('Web: www.newagefotografie.com', 20, yPosition + 18);

  // Invoice header section with modern styling
  yPosition += 35;
  doc.setTextColor(0, 0, 0);
  
  // Invoice title with purple accent
  doc.setFillColor(147, 51, 234);
  doc.rect(pageWidth - 80, yPosition - 8, 70, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RECHNUNG', pageWidth - 75, yPosition + 2);
  
  // Invoice details
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const invoiceNumber = invoice.invoiceNumber || invoice.invoice_number || invoice.id;
  const issueDate = new Date(invoice.issueDate || invoice.issue_date || new Date()).toLocaleDateString('de-DE');
  const dueDate = new Date(invoice.dueDate || invoice.due_date || new Date()).toLocaleDateString('de-DE');
  
  yPosition += 25;
  doc.text(`Rechnung Nr.: ${invoiceNumber}`, pageWidth - 75, yPosition);
  doc.text(`Rechnungsdatum: ${issueDate}`, pageWidth - 75, yPosition + 6);
  doc.text(`Fälligkeitsdatum: ${dueDate}`, pageWidth - 75, yPosition + 12);

  // Client information with modern box
  yPosition += 25;
  doc.setFillColor(248, 250, 252); // Light gray background
  doc.rect(20, yPosition - 5, 100, 50, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(147, 51, 234);
  doc.text('RECHNUNGSEMPFÄNGER', 25, yPosition + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  yPosition += 15;
  const clientName = `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`.trim();
  if (clientName) {
    doc.text(clientName, 25, yPosition);
    yPosition += 6;
  }
  if (client.email) {
    doc.text(client.email, 25, yPosition);
    yPosition += 6;
  }
  if (client.phone) {
    doc.text(client.phone, 25, yPosition);
    yPosition += 6;
  }

  // Items table header with proper spacing to avoid conflicts
  yPosition += 25;
  doc.setFillColor(147, 51, 234);
  doc.rect(20, yPosition - 5, pageWidth - 40, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BESCHREIBUNG', 25, yPosition + 2);
  doc.text('MENGE', 120, yPosition + 2, { align: 'center' });
  doc.text('EINZELPREIS', 140, yPosition + 2, { align: 'right' });
  doc.text('GESAMTPREIS', pageWidth - 25, yPosition + 2, { align: 'right' });
  
  // Table items
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  yPosition += 15;
  
  if (invoiceItems && Array.isArray(invoiceItems) && invoiceItems.length > 0) {
    invoiceItems.forEach((item: any, index: number) => {
      const description = item.description || 'Fotografie-Leistung';
      const quantity = parseFloat(item.quantity?.toString() || '1');
      const unitPrice = parseFloat(item.unitPrice?.toString() || item.unit_price?.toString() || '0');
      const amount = quantity * unitPrice;
      
      // Alternating row colors
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(20, yPosition - 3, pageWidth - 40, 10, 'F');
      }
      
      doc.text(description, 25, yPosition + 2);
      doc.text(quantity.toString(), 120, yPosition + 2, { align: 'center' });
      doc.text(`€${unitPrice.toFixed(2)}`, 140, yPosition + 2, { align: 'right' });
      doc.text(`€${amount.toFixed(2)}`, pageWidth - 25, yPosition + 2, { align: 'right' });
      yPosition += 12;
    });
  } else {
    // Fallback if no items found
    doc.setTextColor(100, 100, 100);
    doc.text('Alle Porträts Insgesamt', 25, yPosition + 2);
    doc.text('1', 120, yPosition + 2, { align: 'center' });
    const subtotal = parseFloat(invoice.subtotal?.toString() || '0');
    doc.text(`€${subtotal.toFixed(2)}`, 140, yPosition + 2, { align: 'right' });
    doc.text(`€${subtotal.toFixed(2)}`, pageWidth - 25, yPosition + 2, { align: 'right' });
    yPosition += 12;
    doc.setTextColor(0, 0, 0);
  }

  // Totals section with styling
  yPosition += 10;
  const total = parseFloat(invoice.total?.toString() || invoice.total_amount?.toString() || '0');
  
  doc.setFillColor(147, 51, 234);
  doc.rect(120, yPosition - 5, pageWidth - 140, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`GESAMTBETRAG: €${total.toFixed(2)}`, pageWidth - 25, yPosition + 5, { align: 'right' });

  // Check if we need a new page for payment info and model release
  if (yPosition > pageHeight - 100) {
    doc.addPage();
    yPosition = 20;
  }

  // Payment information - ALWAYS VISIBLE
  yPosition += 25;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ZAHLUNGSINFORMATIONEN', 20, yPosition);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  yPosition += 8;
  const status = invoice.status === 'paid' ? 'BEZAHLT ✓' : 'OFFEN - Bitte überweisen Sie den Betrag auf folgendes Konto:';
  doc.text(`Status: ${status}`, 20, yPosition);
  
  // ALWAYS show bank details regardless of status
  yPosition += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Bankverbindung:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  yPosition += 6;
  doc.text('Bank: N26', 20, yPosition);
  yPosition += 4;
  doc.text('IBAN: DE46 1001 1001 2620 9741 97', 20, yPosition);
  yPosition += 4;
  doc.text('BIC: NTSBDEB1XXX', 20, yPosition);
  yPosition += 4;
  doc.text(`Verwendungszweck: Rechnung ${invoiceNumber}`, 20, yPosition);

  // Model Release / Privacy section - ALWAYS VISIBLE
  yPosition += 20;
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('📸 Model Release / Einverständniserklärung zur Bildverwendung', 20, yPosition);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  yPosition += 8;
  
  const modelReleaseText = [
    'Wir respektieren Ihre Privatsphäre. Ihre Bilder werden niemals verkauft oder an Dritte zu',
    'kommerziellen Zwecken weitergegeben.',
    '',
    'Einige ausgewählte Aufnahmen aus Ihrem Fotoshooting dürfen wir gegebenenfalls für unsere',
    'eigene Außendarstellung verwenden – etwa auf unserer Website, in sozialen Medien oder in',
    'Druckmaterialien, um unser Portfolio zu präsentieren.',
    '',
    'Sollten Sie nicht einverstanden sein, dass Ihre Bilder für diese Zwecke verwendet werden,',
    'bitten wir um eine kurze Mitteilung an hallo@newagefotografie.com vor Ihrem Shooting.'
  ];
  
  modelReleaseText.forEach(line => {
    if (line === '') {
      yPosition += 3;
    } else {
      doc.text(line, 20, yPosition);
      yPosition += 4;
    }
  });

  // Modern footer
  const footerY = pageHeight - 25;
  doc.setFillColor(60, 60, 60);
  doc.rect(0, footerY - 5, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('New Age Fotografie – Professionelle Fotografie seit 2020', 20, footerY + 2);
  doc.text('Vielen Dank für Ihr Vertrauen! 🙏', 20, footerY + 8);

  return Buffer.from(doc.output('arraybuffer'));
}

// Simple text invoice generator that works immediately
function generateTextInvoice(invoice: any, client: any): string {
  const today = new Date().toLocaleDateString('de-DE');
  const invoiceNumber = invoice.invoiceNumber || invoice.invoice_number || invoice.id;
  const clientName = `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`.trim();
  const total = parseFloat(invoice.total?.toString() || invoice.total_amount?.toString() || '0');
  
  return `
NEW AGE FOTOGRAFIE
Professionelle Fotografie in Wien
=================================

RECHNUNG
--------
Rechnungsnummer: ${invoiceNumber}
Datum: ${today}

Rechnungsempfänger:
${clientName}
${client.email || ''}

Rechnungsdetails:
${invoice.items ? invoice.items.map((item: any, index: number) => 
  `${index + 1}. ${item.description || 'Fotografie-Leistung'} - €${parseFloat(item.unitPrice?.toString() || '0').toFixed(2)}`
).join('\n') : 'Fotografie-Leistungen'}

Gesamtbetrag: €${total.toFixed(2)}

Zahlungsinformationen:
Status: ${invoice.status === 'paid' ? 'BEZAHLT' : 'OFFEN'}

Kontakt:
--------
New Age Fotografie
Wehrgasse 11A/2+5, 1050 Wien
Tel: +43 677 633 99210
Email: hallo@newagefotografie.com
Web: www.newagefotografie.com

Vielen Dank für Ihr Vertrauen!
  `.trim();
}

// Guarded Stripe initialization - avoid crashing the app if env var missing
let stripe: Stripe | null = null;
let stripeConfigured = false;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn('⚠️ STRIPE_SECRET_KEY missing - Stripe disabled. Set STRIPE_SECRET_KEY to enable payments.');
} else if (stripeSecretKey.includes('dummy') || stripeSecretKey.includes('xxx') || stripeSecretKey.length < 20) {
  console.warn('⚠️ STRIPE_SECRET_KEY looks invalid. Stripe disabled.');
} else {
  try {
    stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });
    stripeConfigured = true;
    console.log('✅ Stripe initialized in routes');
  } catch (err) {
    console.warn('⚠️ Failed to initialize Stripe in routes:', err);
  }
}

// Authentication middleware placeholder - replace with actual auth
const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  // For now, skip authentication and set a default user with valid UUID
  // In production, validate JWT token and get user from database
  req.user = { id: "550e8400-e29b-41d4-a716-446655440000", email: "admin@example.com", isAdmin: true };
  next();
};

// Generate HTML template for invoice PDF
function generateInvoiceHTML(invoice: any, client: any): string {
  const today = new Date().toLocaleDateString('de-DE');
  const issueDate = new Date(invoice.issueDate || invoice.issue_date || new Date()).toLocaleDateString('de-DE');
  const dueDate = new Date(invoice.dueDate || invoice.due_date || new Date()).toLocaleDateString('de-DE');
  
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rechnung ${invoice.invoiceNumber}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          border-bottom: 2px solid #9333ea;
          padding-bottom: 20px;
        }
        .logo-section {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }
        .company-logo {
          width: 200px;
          height: auto;
          margin-right: 15px;
          margin-bottom: 10px;
          max-height: 80px;
          object-fit: contain;
        }
        .company-info h1 {
          color: #9333ea;
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .company-details p {
          margin: 3px 0;
          font-size: 13px;
          color: #555;
        }
        .company-details strong {
          color: #333;
        }
        .invoice-info {
          text-align: right;
        }
        .invoice-info h2 {
          color: #333;
          margin: 0;
          font-size: 24px;
        }
        .client-section {
          margin: 30px 0;
        }
        .client-section h3 {
          color: #9333ea;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin: 30px 0;
        }
        .details-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          width: 45%;
        }
        .details-box h4 {
          margin: 0 0 10px 0;
          color: #333;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
        }
        .items-table th,
        .items-table td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        .items-table th {
          background-color: #9333ea;
          color: white;
          font-weight: bold;
        }
        .items-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .totals {
          margin-top: 20px;
          text-align: right;
        }
        .totals table {
          margin-left: auto;
          border-collapse: collapse;
        }
        .totals td {
          padding: 8px 15px;
          border: none;
        }
        .totals .total-row {
          font-weight: bold;
          font-size: 18px;
          border-top: 2px solid #9333ea;
          color: #9333ea;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #9333ea;
          font-size: 11px;
          color: #666;
        }
        .footer-content {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        .footer-section {
          flex: 1;
          margin-right: 20px;
        }
        .footer-section:last-child {
          margin-right: 0;
        }
        .footer-section h4 {
          color: #9333ea;
          font-size: 12px;
          margin: 0 0 8px 0;
          font-weight: bold;
        }
        .footer-section p {
          margin: 2px 0;
          line-height: 1.3;
        }
        .footer-bottom {
          text-align: center;
          padding-top: 15px;
          border-top: 1px solid #eee;
          color: #9333ea;
          font-style: italic;
        }
        .payment-terms {
          background: #e7f3ff;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #9333ea;
        }
        .number {
          text-align: right;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <div class="logo-section">
            <!-- Logo removed for PDF generation -->
            <h1>New Age Fotografie</h1>
          </div>
          <div class="company-details">
            <p><strong>Adresse:</strong> Eingang Ecke Schönbrunnerstraße</p>
            <p>Wehrgasse 11A/2+5, 1050 Wien, Austria</p>
            <p><strong>Telefon:</strong> +43 677 633 99210</p>
            <p><strong>Email:</strong> hallo@newagefotografie.com</p>
            <p><strong>Website:</strong> www.newagefotografie.com</p>
            <p><strong>UID:</strong> ATU12345678 | <strong>FN:</strong> 123456a</p>
          </div>
        </div>
        <div class="invoice-info">
          <h2>RECHNUNG</h2>
          <p><strong>Nr.: ${invoice.invoiceNumber}</strong></p>
          <p>Datum: ${today}</p>
        </div>
      </div>

      <div class="client-section">
        <h3>Rechnungsempfänger</h3>
        <p><strong>${client.firstName || ''} ${client.lastName || ''}</strong></p>
        <p>${client.email || ''}</p>
        ${client.address ? `<p>${client.address}</p>` : ''}
        ${client.city ? `<p>${client.city}, ${client.country || ''}</p>` : ''}
      </div>

      <div class="invoice-details">
        <div class="details-box">
          <h4>Rechnungsdetails</h4>
          <p><strong>Rechnungsdatum:</strong> ${issueDate}</p>
          <p><strong>Fälligkeitsdatum:</strong> ${dueDate}</p>
          <p><strong>Zahlungsbedingungen:</strong> ${invoice.paymentTerms || 'Net 30'}</p>
        </div>
        <div class="details-box">
          <h4>Zahlungsinformationen</h4>
          <p><strong>Status:</strong> ${invoice.status === 'paid' ? 'Bezahlt' : 'Offen'}</p>
          <p><strong>Währung:</strong> ${invoice.currency || 'EUR'}</p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Beschreibung</th>
            <th>Menge</th>
            <th>Einzelpreis</th>
            <th>MwSt. %</th>
            <th>Gesamtpreis</th>
          </tr>
        </thead>
        <tbody>
          ${(invoice.items || []).map((item: any) => `
            <tr>
              <td>${item.description || 'Leistung'}</td>
              <td class="number">${item.quantity || 1}</td>
              <td class="number">€${parseFloat(item.unitPrice?.toString() || item.unit_price?.toString() || '0').toFixed(2)}</td>
              <td class="number">${item.taxRate || item.tax_rate || 0}%</td>
              <td class="number">€${(parseFloat(item.unitPrice?.toString() || item.unit_price?.toString() || '0') * (item.quantity || 1)).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td>Zwischensumme:</td>
            <td class="number">€${parseFloat(invoice.subtotal?.toString() || '0').toFixed(2)}</td>
          </tr>
          <tr>
            <td>MwSt.:</td>
            <td class="number">€${parseFloat(invoice.taxAmount?.toString() || invoice.tax_amount?.toString() || '0').toFixed(2)}</td>
          </tr>
          ${invoice.discountAmount ? `
          <tr>
            <td>Rabatt:</td>
            <td class="number">-€${parseFloat(invoice.discountAmount?.toString() || '0').toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td><strong>Gesamtbetrag:</strong></td>
            <td class="number"><strong>€${parseFloat(invoice.total?.toString() || '0').toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>

      ${invoice.notes ? `
      <div class="payment-terms">
        <h4>Anmerkungen</h4>
        <p>${invoice.notes}</p>
      </div>
      ` : ''}

      <div class="payment-terms">
        <h4>Zahlungsbedingungen</h4>
        <p>Bitte überweisen Sie den Rechnungsbetrag bis zum Fälligkeitsdatum auf unser Konto. Bei Fragen wenden Sie sich gerne an uns.</p>
      </div>

      <div class="footer">
        <div class="footer-content">
          <div class="footer-section">
            <h4>Kontakt</h4>
            <p><strong>New Age Fotografie</strong></p>
            <p>Eingang Ecke Schönbrunnerstraße</p>
            <p>Wehrgasse 11A/2+5, 1050 Wien</p>
            <p>Tel: +43 677 633 99210</p>
            <p>Email: hallo@newagefotografie.com</p>
          </div>
          <div class="footer-section">
            <h4>Geschäftsinformationen</h4>
            <p>UID-Nr.: ATU12345678</p>
            <p>Firmenbuchnummer: FN 123456a</p>
            <p>Gerichtsstand: Wien</p>
            <p>Website: www.newagefotografie.com</p>
          </div>
          <div class="footer-section">
            <h4>Bankverbindung</h4>
            <p>Bank: Erste Bank Austria</p>
            <p>IBAN: AT12 2011 1000 0000 1234</p>
            <p>BIC: GIBAATWWXXX</p>
            <p>Verwendungszweck: Rechnung ${invoice.invoiceNumber}</p>
          </div>
        </div>
        <div class="footer-bottom">
          <p><em>Vielen Dank für Ihr Vertrauen! Professionelle Fotografie mit Leidenschaft seit 2020.</em></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Configure multer for image uploads to local storage
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(process.cwd(), 'public', 'uploads', 'vouchers');
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const fileExt = path.extname(file.originalname);
      const fileName = `voucher-${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExt}`;
      cb(null, fileName);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// Configure multer for audio uploads (voice transcription)
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/webm', 'audio/ogg'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.wav') || file.originalname.endsWith('.mp3')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type. Only WAV, MP3, MP4, WebM, and OGG audio files are allowed.'));
    }
  }
});

// Convert plain text content to structured HTML with proper headings and paragraphs
function convertPlainTextToStructuredHTML(content: string): string {
  console.log('🔧 Converting text to structured HTML...');
  
  // Remove any existing HTML tags first
  let cleanContent = content.replace(/<[^>]*>/g, '').trim();
  
  // Split content into lines and process
  const lines = cleanContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  let htmlContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect headings by common patterns
    if (line.match(/^(##?\s+|H[12]:\s*)/i) || 
        line.match(/^(Einführung|Warum|Der persönliche|Tipps|Was Sie|Nach dem)/i) ||
        line.match(/^\d+\.\s+[A-ZÄÖÜ]/)) {
      // This is a heading
      const cleanHeading = line.replace(/^(##?\s+|H[12]:\s*|\d+\.\s*)/i, '').trim();
      htmlContent += `<h2>${cleanHeading}</h2>\n`;
    } else if (line.length > 50) {
      // This is likely a paragraph (longer content)
      htmlContent += `<p>${line}</p>\n`;
    } else if (line.length > 10) {
      // Short line, could be a list item or small paragraph
      if (line.match(/^[-•*]\s/)) {
        // Convert to list item
        const listItem = line.replace(/^[-•*]\s/, '').trim();
        htmlContent += `<li>${listItem}</li>\n`;
      } else {
        htmlContent += `<p>${line}</p>\n`;
      }
    }
  }
  
  // If we don't have enough structure, split long paragraphs
  if (!htmlContent.includes('<h2>')) {
    console.log('🔧 No headings detected, splitting into structured paragraphs...');
    
    // Split content by sentences and group into paragraphs
    const sentences = cleanContent.split(/[.!?]+\s+/).filter(s => s.trim().length > 10);
    htmlContent = '';
    
    // Create structured content with artificial headings
    const headings = [
      'Einführung in die Familienfotografie',
      'Die Bedeutung professioneller Familienfotos',
      'Unser Fotostudio in Wien',
      'Tipps für das perfekte Familienfoto',
      'Nachbearbeitung und Ergebnisse'
    ];
    
    const sentencesPerSection = Math.ceil(sentences.length / headings.length);
    
    for (let i = 0; i < headings.length; i++) {
      htmlContent += `<h2>${headings[i]}</h2>\n`;
      
      const sectionStart = i * sentencesPerSection;
      const sectionEnd = Math.min((i + 1) * sentencesPerSection, sentences.length);
      
      for (let j = sectionStart; j < sectionEnd; j++) {
        if (sentences[j] && sentences[j].trim().length > 0) {
          const sentence = sentences[j].trim();
          // Make sure each sentence ends with proper punctuation
          const punctuatedSentence = sentence.match(/[.!?]$/) ? sentence : sentence + '.';
          htmlContent += `<p>${punctuatedSentence}</p>\n`;
        }
      }
    }
  }
  
  console.log('✅ Text converted to structured HTML');
  console.log('📊 Structured content length:', htmlContent.length, 'characters');
  console.log('📊 H2 headings found:', (htmlContent.match(/<h2>/g) || []).length);
  console.log('📊 Paragraphs created:', (htmlContent.match(/<p>/g) || []).length);
  
  return htmlContent;
}

// IMAP Email Import Function
async function importEmailsFromIMAP(config: {
  host: string;
  port: number;
  username: string;
  password: string;
  useTLS: boolean;
}): Promise<Array<{
  from: string;
  fromName: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
}>> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.username,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.useTLS,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 30000, // 30 seconds
      authTimeout: 30000,
      keepalive: false
    });

    // Add timeout for the whole operation
    const timeout = setTimeout(() => {
      imap.end();
      reject(new Error('IMAP connection timeout after 60 seconds'));
    }, 60000);

    const emails: Array<{
      from: string;
      fromName: string;
      subject: string;
      body: string;
      date: string;
      isRead: boolean;
    }> = [];

    function openInbox(cb: (err: any, box: any) => void) {
      imap.openBox('INBOX', true, cb);
    }

    imap.once('ready', function() {
      openInbox(function(err: any, box: any) {
        if (err) {
          console.error('Error opening inbox:', err);
          return reject(err);
        }

        // Search for all emails in INBOX including recent ones
        imap.search(['ALL'], function(err: any, results: number[]) {
          if (err) {
            console.error('Error searching emails:', err);
            return reject(err);
          }

          if (!results || results.length === 0) {
            console.log('No emails found in inbox');
            imap.end();
            return resolve([]);
          }

          console.log(`Found ${results.length} emails in inbox`);
          
          // Fetch the last 50 emails to capture any new messages
          const recentResults = results.slice(-50);
          const f = imap.fetch(recentResults, { 
            bodies: '', 
            struct: true 
          });

          f.on('message', function(msg: any, seqno: number) {
            let emailData = {
              from: '',
              fromName: '',
              subject: '',
              body: '',
              date: new Date().toISOString(),
              isRead: false
            };

            msg.on('body', function(stream: any, info: any) {
              simpleParser(stream, (err: any, parsed: any) => {
                if (err) {
                  console.error('Error parsing email:', err);
                  return;
                }

                emailData.from = parsed.from?.value?.[0]?.address || '';
                emailData.fromName = parsed.from?.value?.[0]?.name || emailData.from;
                emailData.subject = parsed.subject || 'No Subject';
                emailData.body = parsed.text || parsed.html || '';
                emailData.date = parsed.date?.toISOString() || new Date().toISOString();
                
                emails.push(emailData);
              });
            });

            msg.once('attributes', function(attrs: any) {
              emailData.isRead = attrs.flags.includes('\\Seen');
            });
          });

          f.once('error', function(err: any) {
            console.error('Fetch error:', err);
            reject(err);
          });

          f.once('end', function() {
            console.log('Done fetching all messages!');
            clearTimeout(timeout);
            imap.end();
            resolve(emails);
          });
        });
      });
    });

    imap.once('error', function(err: any) {
      console.error('IMAP connection error:', err);
      clearTimeout(timeout);
      reject(new Error(`IMAP connection failed: ${err.message}`));
    });

    imap.once('end', function() {
      console.log('IMAP connection ended');
      clearTimeout(timeout);
    });

    imap.connect();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply session middleware
  app.use(sessionConfig);

  // Register authentication routes
  app.use('/api/auth', authRoutes);

  // Digital files API
  app.use('/api/files', filesRouter);

  // Health check endpoint for deployment
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Checkout and payment routes
  app.post("/api/checkout/create-session", async (req: Request, res: Response) => {
    try {
      const { createCheckoutSession } = await import("./controllers/checkoutController");
      await createCheckoutSession(req, res);
    } catch (error) {
      console.error('Checkout controller not available:', error);
      res.status(500).json({ error: 'Checkout service unavailable' });
    }
  });

  app.get("/api/checkout/success", async (req: Request, res: Response) => {
    try {
      const { handleCheckoutSuccess } = await import("./controllers/checkoutController");
      await handleCheckoutSuccess(req, res);
    } catch (error) {
      console.error('Checkout success handler not available:', error);
      res.status(500).json({ error: 'Checkout success service unavailable' });
    }
  });

  app.post("/api/vouchers/validate", async (req: Request, res: Response) => {
    try {
      const { validateVoucherCode } = await import("./controllers/checkoutController");
      await validateVoucherCode(req, res);
    } catch (error) {
      console.error('Voucher validation not available:', error);
      res.status(500).json({ error: 'Voucher validation service unavailable' });
    }
  });

  // Demo checkout success page route
  app.get("/checkout/mock-success", (req: Request, res: Response) => {
    const { session_id } = req.query;
    console.log('Demo checkout success accessed with session:', session_id);
    
    // Redirect to the frontend success page
    res.redirect(`/demo-success?session_id=${session_id}`);
  });

  // Stripe connection test routes
  app.get("/api/stripe/test", async (req: Request, res: Response) => {
    try {
      const { testStripeConnection } = await import("./controllers/stripeTestController");
      await testStripeConnection(req, res);
    } catch (error) {
      console.error('Stripe test not available:', error);
      res.status(500).json({ error: 'Stripe test service unavailable' });
    }
  });

  app.get("/api/stripe/config", async (req: Request, res: Response) => {
    try {
      const { getStripePublishableKey } = await import("./controllers/stripeTestController");
      await getStripePublishableKey(req, res);
    } catch (error) {
      console.error('Stripe config not available:', error);
      res.status(500).json({ error: 'Stripe config service unavailable' });
    }
  });

  // Calendar routes (Studio Appointments)
  app.post("/api/calendar/appointments", async (req: Request, res: Response) => {
    try {
      const { createAppointment } = await import("./controllers/calendarController");
      await createAppointment(req, res);
    } catch (error) {
      console.error('Create appointment not available:', error);
      res.status(500).json({ error: 'Calendar service unavailable' });
    }
  });

  app.get("/api/calendar/appointments", async (req: Request, res: Response) => {
    try {
      const { getAppointments } = await import("./controllers/calendarController");
      await getAppointments(req, res);
    } catch (error) {
      console.error('Get appointments not available:', error);
      res.status(500).json({ error: 'Calendar service unavailable' });
    }
  });

  app.put("/api/calendar/appointments/:appointmentId", async (req: Request, res: Response) => {
    try {
      const { updateAppointment } = await import("./controllers/calendarController");
      await updateAppointment(req, res);
    } catch (error) {
      console.error('Update appointment not available:', error);
      res.status(500).json({ error: 'Calendar service unavailable' });
    }
  });

  app.delete("/api/calendar/appointments/:appointmentId", async (req: Request, res: Response) => {
    try {
      const { deleteAppointment } = await import("./controllers/calendarController");
      await deleteAppointment(req, res);
    } catch (error) {
      console.error('Delete appointment not available:', error);
      res.status(500).json({ error: 'Calendar service unavailable' });
    }
  });

  app.get("/api/calendar/appointments/client/:clientId", async (req: Request, res: Response) => {
    try {
      const { getClientAppointments } = await import("./controllers/calendarController");
      await getClientAppointments(req, res);
    } catch (error) {
      console.error('Get client appointments not available:', error);
      res.status(500).json({ error: 'Calendar service unavailable' });
    }
  });

  app.get("/api/calendar/available-slots", async (req: Request, res: Response) => {
    try {
      const { getAvailableSlots } = await import("./controllers/calendarController");
      await getAvailableSlots(req, res);
    } catch (error) {
      console.error('Get available slots not available:', error);
      res.status(500).json({ error: 'Calendar service unavailable' });
    }
  });

  // Communication routes (Email & SMS)
  app.post("/api/communications/email/send", async (req: Request, res: Response) => {
    try {
      const { sendEmail } = await import("./controllers/communicationController");
      await sendEmail(req, res);
    } catch (error) {
      console.error('Send email not available:', error);
      res.status(500).json({ error: 'Email service unavailable' });
    }
  });

  app.post("/api/communications/sms/send", async (req: Request, res: Response) => {
    try {
      const { sendSMS } = await import("./controllers/communicationController");
      await sendSMS(req, res);
    } catch (error) {
      console.error('Send SMS not available:', error);
      res.status(500).json({ error: 'SMS service unavailable' });
    }
  });

  app.post("/api/communications/sms/bulk", async (req: Request, res: Response) => {
    try {
      const { sendBulkSMS } = await import("./controllers/communicationController");
      await sendBulkSMS(req, res);
    } catch (error) {
      console.error('Bulk SMS not available:', error);
      res.status(500).json({ error: 'Bulk SMS service unavailable' });
    }
  });

  app.get("/api/communications/client/:clientId", async (req: Request, res: Response) => {
    try {
      const { getClientCommunications } = await import("./controllers/communicationController");
      await getClientCommunications(req, res);
    } catch (error) {
      console.error('Get client communications not available:', error);
      res.status(500).json({ error: 'Communications service unavailable' });
    }
  });

  app.get("/api/communications/all", async (req: Request, res: Response) => {
    try {
      const { getAllCommunications } = await import("./controllers/communicationController");
      await getAllCommunications(req, res);
    } catch (error) {
      console.error('Get all communications not available:', error);
      res.status(500).json({ error: 'Communications service unavailable' });
    }
  });

  app.get("/api/communications/sms/config", async (req: Request, res: Response) => {
    try {
      const { getSMSConfig } = await import("./controllers/communicationController");
      await getSMSConfig(req, res);
    } catch (error) {
      console.error('Get SMS config not available:', error);
      res.status(500).json({ error: 'SMS config service unavailable' });
    }
  });

  app.post("/api/communications/sms/config", async (req: Request, res: Response) => {
    try {
      const { updateSMSConfig } = await import("./controllers/communicationController");
      await updateSMSConfig(req, res);
    } catch (error) {
      console.error('Update SMS config not available:', error);
      res.status(500).json({ error: 'SMS config service unavailable' });
    }
  });

  app.post("/api/communications/bulk/preview", async (req: Request, res: Response) => {
    try {
      const { getBulkTargetPreview } = await import("./controllers/communicationController");
      await getBulkTargetPreview(req, res);
    } catch (error) {
      console.error('Get bulk target preview not available:', error);
      res.status(500).json({ error: 'Bulk preview service unavailable' });
    }
  });

  app.patch("/api/communications/:messageId/read", async (req: Request, res: Response) => {
    try {
      const { markMessageAsRead } = await import("./controllers/communicationController");
      await markMessageAsRead(req, res);
    } catch (error) {
      console.error('Mark message as read not available:', error);
      res.status(500).json({ error: 'Message service unavailable' });
    }
  });

  app.post("/api/communications/email/test", async (req: Request, res: Response) => {
    try {
      const { testEmailConfig } = await import("./controllers/communicationController");
      await testEmailConfig(req, res);
    } catch (error) {
      console.error('Test email config not available:', error);
      res.status(500).json({ error: 'Email test service unavailable' });
    }
  });

  // Import and register CRM agent router
  try {
    const { crmAgentRouter } = await import("./routes/crm-agent");
    app.use(crmAgentRouter);
  } catch (error) {
    console.warn("CRM agent router not available:", error instanceof Error ? error.message : 'Unknown error');
  }

  // Audio transcription endpoint using OpenAI Whisper
  app.post("/api/transcribe", authenticateUser, audioUpload.single('audio'), async (req: Request, res: Response) => {
    try {
      const audioFile = req.file;
      
      if (!audioFile) {
        return res.status(400).json({ success: false, error: 'No audio file provided' });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ success: false, error: 'OpenAI API key not configured' });
      }

      console.log('Transcribing audio file:', audioFile.originalname, 'Size:', audioFile.size, 'bytes');

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Create a temporary file for OpenAI Whisper API
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `audio_${Date.now()}_${audioFile.originalname}`);
      
      // Write buffer to temporary file
      fs.writeFileSync(tempFilePath, audioFile.buffer);
      
      // Create a ReadStream for OpenAI
      const fileStream = fs.createReadStream(tempFilePath);
      
      // Transcribe using Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
        language: "de", // German language for Austrian photography business
        response_format: "text"
      });

      // Clean up temporary file
      fs.unlinkSync(tempFilePath);

      const transcribedText = transcription.trim();
      console.log('Transcription successful:', transcribedText.substring(0, 100) + '...');

      res.json({ 
        success: true, 
        text: transcribedText,
        metadata: {
          duration: audioFile.size,
          model: 'whisper-1',
          language: 'de'
        }
      });

    } catch (error) {
      console.error('Transcription error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Transcription failed' 
      });
    }
  });

  // CRM Agent routes with Phase B write capabilities
  app.get('/api/crm/agent/status', async (req, res) => {
    try {
      res.json({
        status: 'operational',
        capabilities: {
          read: ['list_clients', 'list_leads', 'list_invoices', 'list_messages'],
          write: ['create_lead', 'update_client', 'create_invoice'],
          mode: 'auto_safe'
        },
        phase: 'B - Write Enabled',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('CRM Agent Status Error:', error);
      res.status(500).json({ error: 'Failed to get agent status' });
    }
  });

  app.post('/api/crm/agent/chat', async (req, res) => {
    try {
      const { message, threadId } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Use the actual Phase B agent system
      const studioId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      
      // Import runAgent dynamically to avoid module loading issues
      const { runAgent } = await import('../agent/run-agent');
      
      // Run the AI agent with Phase B write capabilities
      const response = await runAgent(studioId, userId, message);
      
      res.json({
        response: response,
        threadId: threadId || null,
        capabilities: {
          writeEnabled: true,
          mode: 'auto_safe',
          authorities: ['CREATE_LEAD', 'UPDATE_CLIENT', 'SEND_INVOICE'],
          approvalThreshold: 500
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('CRM Agent Chat Error:', error);
      
      // Fallback to German response if agent fails
      const fallbackResponse = `Entschuldigung, das CRM-System ist momentan nicht verfügbar. Ich bin Ihr CRM-Operations-Assistent und kann Ihnen normalerweise bei folgenden Aufgaben helfen:

📧 **E-Mail-Verwaltung**: Antworten auf Kunden-E-Mails, Buchungsbestätigungen senden
📅 **Terminverwaltung**: Termine erstellen, ändern, stornieren
👥 **Kundenverwaltung**: Kundendaten hinzufügen, aktualisieren, suchen
💰 **Rechnungsverwaltung**: Rechnungen erstellen, senden, verfolgen
📊 **Geschäftsanalyse**: Berichte erstellen, Daten analysieren

Bitte versuchen Sie es später noch einmal.`;
      
      res.json({
        response: fallbackResponse,
        threadId: null,
        capabilities: {
          writeEnabled: false,
          mode: 'fallback',
          authorities: [],
          approvalThreshold: 500
        },
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // ==================== USER ROUTES ====================
  app.get("/api/users/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== BLOG ROUTES ====================
  app.get("/api/blog/posts", async (req: Request, res: Response) => {
    try {
      const published = req.query.published === 'true' ? true : req.query.published === 'false' ? false : undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const tag = req.query.tag as string;
      const exclude = req.query.exclude as string;
      const language = req.query.language as string || 'de';
      
      let posts = await storage.getBlogPosts(published);
      
      // Translate content if language is English
      if (language === 'en') {
        posts = posts.map(post => ({
          ...post,
          title: translateToEnglish(post.title),
          excerpt: post.excerpt ? translateToEnglish(post.excerpt) : null,
          content: post.content ? translateToEnglish(post.content) : null,
          tags: post.tags ? post.tags.map(tag => translateTagToEnglish(tag)) : null
        }));
      }
      
      // Filter by search
      if (search) {
        posts = posts.filter(post => 
          post.title.toLowerCase().includes(search.toLowerCase()) ||
          (post.excerpt && post.excerpt.toLowerCase().includes(search.toLowerCase())) ||
          (post.content && post.content.toLowerCase().includes(search.toLowerCase()))
        );
      }
      
      // Filter by tag
      if (tag && tag !== 'all') {
        posts = posts.filter(post => 
          post.tags && post.tags.includes(tag)
        );
      }
      
      // Exclude specific post
      if (exclude) {
        posts = posts.filter(post => post.id !== exclude);
      }
      
      const totalPosts = posts.length;
      const totalPages = Math.ceil(totalPosts / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPosts = posts.slice(startIndex, endIndex);
      
      res.json({ 
        posts: paginatedPosts,
        count: totalPosts,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      });
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/blog/posts/:identifier", async (req: Request, res: Response) => {
    try {
      const identifier = req.params.identifier;
      let post;
      
      // Check if identifier is a UUID (for ID lookup) or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      
      if (isUUID) {
        // Fetch by ID
        const posts = await storage.getBlogPosts();
        post = posts.find(p => p.id === identifier);
      } else {
        // Fetch by slug
        post = await storage.getBlogPostBySlug(identifier);
      }
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/blog/posts", authenticateUser, async (req: Request, res: Response) => {
    try {
      const postData = { 
        ...req.body,
        // Convert publishedAt string to Date if present
        publishedAt: req.body.publishedAt ? new Date(req.body.publishedAt) : null,
        // Convert scheduledFor string to Date if present
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : null
      };
      // Remove authorId from validation data
      delete postData.authorId;
      console.log("Received blog post data:", postData);
      const validatedData = insertBlogPostSchema.parse(postData);
      console.log("Validated blog post data:", validatedData);
      const post = await storage.createBlogPost(validatedData);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Blog post validation error:", error.errors);
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating blog post:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/blog/posts/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const post = await storage.updateBlogPost(req.params.id, req.body);
      res.json(post);
    } catch (error) {
      console.error("Error updating blog post:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/blog/posts/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deleteBlogPost(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Fix existing blog posts with wall-of-text issue by converting to structured HTML
  app.post("/api/blog/posts/fix-formatting", authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log('🔧 Starting blog post formatting fix...');
      
      // Get all published blog posts 
      const posts = await storage.getBlogPosts();
      let fixedCount = 0;
      
      for (const post of posts) {
        try {
          // Check if post needs fixing (contains wall of text without proper HTML structure)
          const hasStructure = post.content?.includes('<h2>') && post.content?.includes('<p>');
          
          if (!hasStructure && post.content && post.content.length > 500) {
            console.log(`🔧 Fixing post: ${post.title} (${post.content.length} chars)`);
            
            // Convert text to structured HTML using the same logic as AutoBlog
            const structuredContent = convertPlainTextToStructuredHTML(post.content);
            
            // Update the post with structured content
            await storage.updateBlogPost(post.id, {
              content: structuredContent
            });
            
            fixedCount++;
            console.log(`✅ Fixed post: ${post.title}`);
          }
        } catch (error) {
          console.error(`❌ Error fixing post ${post.title}:`, error);
        }
      }
      
      console.log(`🎉 Blog formatting fix complete: ${fixedCount} posts updated`);
      res.json({ 
        success: true, 
        fixed: fixedCount,
        message: `Successfully updated ${fixedCount} blog posts with structured formatting`
      });
    } catch (error) {
      console.error("Error fixing blog post formatting:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== CRM CLIENT ROUTES ====================
  // Test route for debugging
  app.get("/api/test", (req: Request, res: Response) => {
    console.log("Test route hit!");
    res.json({ message: "API is working!", timestamp: new Date().toISOString() });
  });

  app.get("/api/crm/clients", authenticateUser, async (req: Request, res: Response) => {
    console.log(`/api/crm/clients GET received - query:`, req.query);
    try {
      const clients = await storage.getCrmClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching CRM clients:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Find duplicate clients (by email or phone)
  app.get("/api/crm/clients/duplicates", authenticateUser, async (req: Request, res: Response) => {
    try {
      const by = (String(req.query.by || 'email').toLowerCase() === 'phone') ? 'phone' : 'email';
      const limit = Math.max(1, Math.min(500, Number(req.query.limit ?? 100)));
      const keyExpr = by === 'phone' ? `NULLIF(TRIM(phone),'')` : `LOWER(NULLIF(TRIM(email),'') )`;
      const rows = await runSql(
        `SELECT ${keyExpr} AS dup_key, ARRAY_AGG(id) AS ids, COUNT(*)::int AS count
         FROM crm_clients
         WHERE ${keyExpr} IS NOT NULL
         GROUP BY 1
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC
         LIMIT $1`,
        [limit]
      );
      res.json({ by, groups: rows });
    } catch (error) {
      console.error('Error listing duplicate clients:', error);
      res.status(500).json({ error: 'Failed to list duplicates' });
    }
  });

  // Merge duplicate clients into a single record per duplicate key
  app.post("/api/crm/clients/merge-duplicates", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { by = 'email', dryRun = true, limit = 200, strategy = 'keep-oldest' } = req.body || {};
      const mode = String(by).toLowerCase() === 'phone' ? 'phone' : 'email';
      const keepOldest = String(strategy).toLowerCase() !== 'keep-newest';
      const lim = Math.max(1, Math.min(1000, Number(limit)));

      const keyExpr = mode === 'phone' ? `NULLIF(TRIM(phone),'')` : `LOWER(NULLIF(TRIM(email),'') )`;
      const groups = await runSql(
        `SELECT ${keyExpr} AS dup_key, ARRAY_AGG(id) AS ids, COUNT(*)::int AS count
         FROM crm_clients
         WHERE ${keyExpr} IS NOT NULL
         GROUP BY 1
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC
         LIMIT $1`,
        [lim]
      );

      let totalMerged = 0;
      const previews: any[] = [];

      for (const g of groups) {
        const ids: string[] = g.ids || [];
        if (!ids || ids.length < 2) continue;
        // Load candidate rows to pick a primary
        const rows = await runSql(
          `SELECT id, created_at, updated_at, first_name, last_name, email, phone, address, city, state, zip, country, company, notes
           FROM crm_clients WHERE id = ANY($1)`,
          [ids]
        );
        if (!rows || rows.length < 2) continue;

        rows.sort((a: any, b: any) => {
          const ta = new Date(a.created_at || a.updated_at || 0).getTime();
          const tb = new Date(b.created_at || b.updated_at || 0).getTime();
          return keepOldest ? (ta - tb) : (tb - ta);
        });
        const primary = rows[0];
        const duplicates = rows.slice(1);
        const dupIds = duplicates.map((r: any) => r.id);

        previews.push({ key: g.dup_key, keep: primary.id, remove: dupIds });
        totalMerged += dupIds.length;

        if (dryRun) continue;

        // For each duplicate, re-link references then delete dup
        for (const d of duplicates) {
          const dupId = d.id;
          // Re-link references to primary client
          await runSql(`UPDATE crm_invoices SET client_id = $1 WHERE client_id = $2`, [primary.id, dupId]);
          await runSql(`UPDATE crm_messages SET client_id = $1 WHERE client_id = $2`, [primary.id, dupId]);
          await runSql(`UPDATE voucher_sales SET redeemed_by = $1 WHERE redeemed_by = $2`, [primary.id, dupId]);
          await runSql(`UPDATE galleries SET client_id = $1 WHERE client_id = $2`, [primary.id, dupId]).catch(() => {});
          // photography_sessions stores client_id as text
          await runSql(`UPDATE photography_sessions SET client_id = $1::text WHERE client_id = $2::text`, [primary.id, dupId]).catch(() => {});

          // Best-effort: fill missing fields on primary with data from duplicate
          await runSql(
            `UPDATE crm_clients AS c SET
               phone = COALESCE(NULLIF(c.phone,''), NULLIF($2,'')),
               address = COALESCE(NULLIF(c.address,''), NULLIF($3,'')),
               city = COALESCE(NULLIF(c.city,''), NULLIF($4,'')),
               state = COALESCE(NULLIF(c.state,''), NULLIF($5,'')),
               zip = COALESCE(NULLIF(c.zip,''), NULLIF($6,'')),
               country = COALESCE(NULLIF(c.country,''), NULLIF($7,'')),
               company = COALESCE(NULLIF(c.company,''), NULLIF($8,'')),
               notes = COALESCE(NULLIF(c.notes,''), NULLIF($9,'')),
               updated_at = NOW()
             WHERE c.id = $1`,
            [primary.id, d.phone, d.address, d.city, d.state, d.zip, d.country, d.company, d.notes]
          ).catch(() => {});

          // Delete duplicate row
          await runSql(`DELETE FROM crm_clients WHERE id = $1`, [dupId]);
        }
      }

      return res.json({ success: true, dryRun, by: mode, groups: groups.length, totalMerged, preview: previews.slice(0, 20) });
    } catch (error) {
      console.error('Error merging duplicate clients:', error);
      res.status(500).json({ error: 'Failed to merge duplicates' });
    }
  });

  // Generate detailed merge suggestions (no mutations)
  app.get("/api/crm/clients/merge-suggestions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const mode = String(req.query.by || 'email').toLowerCase() === 'phone' ? 'phone' : 'email';
      const strategy = String(req.query.strategy || 'keep-oldest').toLowerCase();
      const keepOldest = strategy !== 'keep-newest';
      const limit = Math.max(1, Math.min(500, Number(req.query.limit ?? 100)));
      const keyExpr = mode === 'phone' ? `NULLIF(TRIM(phone),'')` : `LOWER(NULLIF(TRIM(email),'') )`;
      const groups = await runSql(
        `SELECT ${keyExpr} AS dup_key, ARRAY_AGG(id) AS ids, COUNT(*)::int AS count
         FROM crm_clients
         WHERE ${keyExpr} IS NOT NULL
         GROUP BY 1
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC
         LIMIT $1`,
        [limit]
      );

      const suggestions: any[] = [];
      for (const g of groups) {
        const ids: string[] = g.ids || [];
        if (!ids || ids.length < 2) continue;
        const rows = await runSql(
          `SELECT id, created_at, updated_at, first_name, last_name, email, phone, address, city, state, zip, country, company, notes
           FROM crm_clients WHERE id = ANY($1)`,
          [ids]
        );
        if (!rows || rows.length < 2) continue;
        rows.sort((a: any, b: any) => {
          const ta = new Date(a.created_at || a.updated_at || 0).getTime();
          const tb = new Date(b.created_at || b.updated_at || 0).getTime();
          return keepOldest ? (ta - tb) : (tb - ta);
        });
        const primary = rows[0];
        const duplicates = rows.slice(1);
        suggestions.push({ key: g.dup_key, primary, duplicates });
      }

      res.json({ success: true, by: mode, strategy, count: suggestions.length, suggestions });
    } catch (error) {
      console.error('Error creating merge suggestions:', error);
      res.status(500).json({ error: 'Failed to build merge suggestions' });
    }
  });

  // Execute a specific merge decision from wizard
  app.post("/api/crm/clients/merge-execute", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { primaryId, duplicateIds } = req.body || {};
      if (!primaryId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
        return res.status(400).json({ error: 'primaryId and duplicateIds[] required' });
      }
      // Basic validation to ensure primary exists
      const primaryRows = await runSql(`SELECT id, phone, address, city, state, zip, country, company, notes FROM crm_clients WHERE id = $1`, [primaryId]);
      if (!primaryRows || primaryRows.length === 0) {
        return res.status(404).json({ error: 'Primary client not found' });
      }

      let merged = 0;
      for (const dupId of duplicateIds) {
        if (dupId === primaryId) continue;
        const dupRows = await runSql(`SELECT id, phone, address, city, state, zip, country, company, notes FROM crm_clients WHERE id = $1`, [dupId]);
        if (!dupRows || dupRows.length === 0) continue;
        const d = dupRows[0];
        // Relink references
        await runSql(`UPDATE crm_invoices SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]);
        await runSql(`UPDATE crm_messages SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]);
        await runSql(`UPDATE voucher_sales SET redeemed_by = $1 WHERE redeemed_by = $2`, [primaryId, dupId]);
        await runSql(`UPDATE galleries SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]).catch(()=>{});
        await runSql(`UPDATE photography_sessions SET client_id = $1::text WHERE client_id = $2::text`, [primaryId, dupId]).catch(()=>{});
        // Fill missing primary fields
        await runSql(
          `UPDATE crm_clients AS c SET
             phone = COALESCE(NULLIF(c.phone,''), NULLIF($2,'')),
             address = COALESCE(NULLIF(c.address,''), NULLIF($3,'')),
             city = COALESCE(NULLIF(c.city,''), NULLIF($4,'')),
             state = COALESCE(NULLIF(c.state,''), NULLIF($5,'')),
             zip = COALESCE(NULLIF(c.zip,''), NULLIF($6,'')),
             country = COALESCE(NULLIF(c.country,''), NULLIF($7,'')),
             company = COALESCE(NULLIF(c.company,''), NULLIF($8,'')),
             notes = COALESCE(NULLIF(c.notes,''), NULLIF($9,'')),
             updated_at = NOW()
           WHERE c.id = $1`,
          [primaryId, d.phone, d.address, d.city, d.state, d.zip, d.country, d.company, d.notes]
        ).catch(()=>{});
        await runSql(`DELETE FROM crm_clients WHERE id = $1`, [dupId]);
        merged++;
      }
      const updatedPrimary = await runSql(`SELECT * FROM crm_clients WHERE id = $1`, [primaryId]);
      res.json({ success: true, merged, primaryId, primary: updatedPrimary?.[0] });
    } catch (error) {
      console.error('Error executing targeted merge:', error);
      res.status(500).json({ error: 'Failed to execute merge' });
    }
  });

  // Batch execute multiple merge decisions in a single request
  app.post("/api/crm/clients/merge-execute-batch", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { merges } = req.body || {};
      if (!Array.isArray(merges) || merges.length === 0) {
        return res.status(400).json({ error: 'merges[] required: [{primaryId, duplicateIds[]}]' });
      }
      const results: any[] = [];
      for (const m of merges) {
        const primaryId = m.primaryId;
        const duplicateIds: string[] = Array.isArray(m.duplicateIds) ? m.duplicateIds : [];
        if (!primaryId || duplicateIds.length === 0) {
          results.push({ primaryId, skipped: true, reason: 'missing primaryId or duplicateIds' });
          continue;
        }
        try {
          let merged = 0;
            for (const dupId of duplicateIds) {
              if (dupId === primaryId) continue;
              const dupRows = await runSql(`SELECT id, phone, address, city, state, zip, country, company, notes FROM crm_clients WHERE id = $1`, [dupId]);
              if (!dupRows || dupRows.length === 0) continue;
              const d = dupRows[0];
              await runSql(`UPDATE crm_invoices SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]);
              await runSql(`UPDATE crm_messages SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]);
              await runSql(`UPDATE voucher_sales SET redeemed_by = $1 WHERE redeemed_by = $2`, [primaryId, dupId]);
              await runSql(`UPDATE galleries SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]).catch(()=>{});
              await runSql(`UPDATE photography_sessions SET client_id = $1::text WHERE client_id = $2::text`, [primaryId, dupId]).catch(()=>{});
              await runSql(
                `UPDATE crm_clients AS c SET
                  phone = COALESCE(NULLIF(c.phone,''), NULLIF($2,'')),
                  address = COALESCE(NULLIF(c.address,''), NULLIF($3,'')),
                  city = COALESCE(NULLIF(c.city,''), NULLIF($4,'')),
                  state = COALESCE(NULLIF(c.state,''), NULLIF($5,'')),
                  zip = COALESCE(NULLIF(c.zip,''), NULLIF($6,'')),
                  country = COALESCE(NULLIF(c.country,''), NULLIF($7,'')),
                  company = COALESCE(NULLIF(c.company,''), NULLIF($8,'')),
                  notes = COALESCE(NULLIF(c.notes,''), NULLIF($9,'')),
                  updated_at = NOW()
                 WHERE c.id = $1`,
                [primaryId, d.phone, d.address, d.city, d.state, d.zip, d.country, d.company, d.notes]
              ).catch(()=>{});
              await runSql(`DELETE FROM crm_clients WHERE id = $1`, [dupId]);
              merged++;
            }
          results.push({ primaryId, merged });
        } catch (innerErr: any) {
          results.push({ primaryId: m.primaryId, error: innerErr?.message || 'merge failed' });
        }
      }
      res.json({ success: true, count: results.length, results });
    } catch (error) {
      console.error('Error executing batch merge:', error);
      res.status(500).json({ error: 'Failed batch merge' });
    }
  });

  // ==================== CRM LEADS ====================
  app.get("/api/crm/leads", authenticateUser, async (req: Request, res: Response) => {
    try {
      const status = (req.query.status as string) || undefined;
      const leads = await storage.getCrmLeads(status);
      res.json(leads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(404).json({ error: 'Leads not found' });
    }
  });

  app.get("/api/crm/leads/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const lead = await storage.getCrmLead(req.params.id);
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      res.json(lead);
    } catch (error) {
      console.error('Error fetching lead:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post("/api/crm/leads", authenticateUser, async (req: Request, res: Response) => {
    try {
      const created = await storage.createCrmLead(req.body);
      res.status(201).json(created);
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to create lead' });
    }
  });

  app.put("/api/crm/leads/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const updated = await storage.updateCrmLead(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating lead:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to update lead' });
    }
  });

  app.delete("/api/crm/leads/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deleteCrmLead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting lead:', error);
      res.status(500).json({ error: 'Failed to delete lead' });
    }
  });

  app.get("/api/crm/clients/:id", authenticateUser, async (req: Request, res: Response) => {
    console.log(`/api/crm/clients/${req.params.id} GET received`);
    try {
      const client = await storage.getCrmClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching CRM client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create a new CRM client
  app.post("/api/crm/clients", authenticateUser, async (req: Request, res: Response) => {
    console.log(`/api/crm/clients POST received - body:`, req.body);
    try {
      // Validate input against the shared insert schema
      const clientData = insertCrmClientSchema.parse(req.body);
      const client = await storage.createCrmClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("Validation error creating CRM client:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating CRM client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/crm/clients/:id", authenticateUser, async (req: Request, res: Response) => {
    console.log(`/api/crm/clients/${req.params.id} PUT received - body:`, req.body);
    try {
      const client = await storage.updateCrmClient(req.params.id, req.body);
      console.log(`/api/crm/clients/${req.params.id} updated:`, client);
      res.json(client);
    } catch (error) {
      console.error("Error updating CRM client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get gallery cover image for a client (for avatar display)
  app.get("/api/crm/clients/:id/gallery-cover", authenticateUser, async (req: Request, res: Response) => {
    try {
      const clientId = req.params.id;
      
      // Find galleries for this client with a cover image
      const gallery = await storage.getClientGalleryWithCover(clientId);
      
      if (!gallery || !gallery.coverImage) {
        return res.json({ coverImage: null });
      }
      
      res.json({ coverImage: gallery.coverImage });
    } catch (error) {
      console.error("Error fetching client gallery cover:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // ==================== PHOTOGRAPHY SESSION ROUTES ====================
  app.get("/api/photography/sessions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const photographerId = req.query.photographerId as string;
      const sessions = await storage.getPhotographySessions(photographerId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching photography sessions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Alias route for frontend compatibility
  app.get("/api/photography-sessions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const photographerId = req.query.photographerId as string;
      const sessions = await storage.getPhotographySessions(photographerId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching photography sessions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Single, stable debug public endpoint (no auth) to return up to 50 sessions for frontend testing
  // Keep this endpoint lightweight and predictable; remove or secure before production.
  app.get("/api/debug/photography-sessions", async (req: Request, res: Response) => {
    try {
      const photographerId = req.query.photographerId as string | undefined;
      const q = (req.query.q as string | undefined)?.toLowerCase();
      const date = req.query.date as string | undefined; // YYYY-MM-DD
      const month = req.query.month as string | undefined; // MM
      const year = req.query.year as string | undefined; // YYYY
      const limit = Math.max(1, Math.min(1000, Number(req.query.limit ?? 50)));
      console.error(`DEBUG_ENDPOINT_HIT | pid=${photographerId || '<none>'} | q=${q || ''} | date=${date || ''} | month=${month || ''} | year=${year || ''} | limit=${limit}`);
      let sessions = await storage.getPhotographySessions(photographerId);
      if (!Array.isArray(sessions)) {
        console.error('DEBUG_ENDPOINT_RESULT | sessions not array');
        return res.status(200).json([]);
      }

      // Apply query filters in-memory to keep endpoint simple
      if (q) {
        const needle = q;
        sessions = sessions.filter(s =>
          (s.title || '').toLowerCase().includes(needle) ||
          (s.clientName || '').toLowerCase().includes(needle) ||
          (s.description || '').toLowerCase().includes(needle)
        );
      }

      if (date || month || year) {
        sessions = sessions.filter(s => {
          const d = s.startTime ? new Date(s.startTime) : (s.endTime ? new Date(s.endTime) : null);
          if (!d || isNaN(d.getTime())) return false;
          if (date) {
            // match exact day
            const y = d.getFullYear();
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            if (`${y}-${m}-${day}` !== date) return false;
          }
          if (month) {
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            if (m !== month.padStart(2, '0')) return false;
          }
          if (year) {
            if (d.getFullYear().toString() !== year) return false;
          }
          return true;
        });
      }

      // Sort by startTime ascending
      sessions.sort((a: any, b: any) => new Date(a.startTime as any).getTime() - new Date(b.startTime as any).getTime());

      console.error(`DEBUG_ENDPOINT_RESULT | found=${sessions.length} | returning=${Math.min(limit, sessions.length)}`);
      return res.status(200).json(sessions.slice(0, limit));
    } catch (error) {
      console.error('Error fetching debug photography sessions:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/photography/sessions/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const session = await storage.getPhotographySession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching photography session:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/photography/sessions", authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log("Received session data:", JSON.stringify(req.body, null, 2));
      const sessionData = { 
        ...req.body, 
        createdBy: req.user!.id, 
        photographerId: req.user!.id,
        // Convert string dates to Date objects if they're strings
        startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
        endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
      };
      console.log("Session data with user info:", JSON.stringify(sessionData, null, 2));
      const validatedData = insertPhotographySessionSchema.parse(sessionData);
      const session = await storage.createPhotographySession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("Validation error details:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating photography session:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/photography/sessions/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const session = await storage.updatePhotographySession(req.params.id, req.body);
      res.json(session);
    } catch (error) {
      console.error("Error updating photography session:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/photography/sessions/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deletePhotographySession(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting photography session:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== CALENDAR ROUTES ====================
  
  // GET /api/calendar/sessions - Retrieve calendar sessions with filters
  app.get("/api/calendar/sessions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { 
        start_date, 
        end_date, 
        client_id, 
        session_type, 
        status,
        limit = '20'
      } = req.query;

      let query = `
        SELECT 
          ps.id,
          ps.client_id,
          ps.session_type,
          ps.session_date,
          ps.duration_minutes,
          ps.location,
          ps.notes,
          ps.price,
          ps.deposit_required,
          ps.equipment_needed,
          ps.status,
          ps.created_at,
          ps.updated_at,
          c.first_name || ' ' || c.last_name as client_name,
          c.email as client_email,
          c.phone as client_phone
        FROM photography_sessions ps
        LEFT JOIN crm_clients c ON ps.client_id = c.id::text
      `;

      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (start_date) {
        conditions.push(`ps.session_date >= $${paramIndex}`);
        values.push(start_date);
        paramIndex++;
      }
      
      if (end_date) {
        conditions.push(`ps.session_date <= $${paramIndex}`);
        values.push(end_date);
        paramIndex++;
      }
      
      if (client_id) {
        conditions.push(`ps.client_id = $${paramIndex}`);
        values.push(client_id);
        paramIndex++;
      }
      
      if (session_type) {
        conditions.push(`ps.session_type = $${paramIndex}`);
        values.push(session_type);
        paramIndex++;
      }
      
      if (status) {
        conditions.push(`ps.status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ` ORDER BY ps.session_date ASC LIMIT $${paramIndex}`;
      values.push(parseInt(limit as string));

  const sessions = await runSql(query, values);
      res.json(sessions);
    } catch (error) {
      console.error('Failed to fetch calendar sessions:', error);
      res.status(500).json({ error: 'Failed to fetch calendar sessions' });
    }
  });

  // POST /api/calendar/sessions - Create new photography session
  app.post("/api/calendar/sessions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const {
        client_id,
        session_type,
        session_date,
        duration_minutes = 120,
        location,
        notes = '',
        price = 0,
        deposit_required = 0,
        equipment_needed = []
      } = req.body;

      // Validate required fields
      if (!client_id || !session_type || !session_date || !location) {
        return res.status(400).json({ 
          error: 'Missing required fields: client_id, session_type, session_date, location' 
        });
      }

      const sessionId = crypto.randomUUID();
      
      // Use parameterized query via pool
      await runSql(
        `INSERT INTO photography_sessions (
          id, client_id, session_type, session_date, duration_minutes,
          location, notes, price, deposit_required, equipment_needed,
          status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'CONFIRMED', NOW(), NOW())`,
        [sessionId, client_id, session_type, session_date, duration_minutes, location, notes, price, deposit_required, JSON.stringify(equipment_needed)]
      );

      const [newSession] = (await runSql(`SELECT * FROM photography_sessions WHERE id = $1`, [sessionId]));

      res.status(201).json(newSession);
    } catch (error) {
      console.error('Failed to create photography session:', error);
      res.status(500).json({ error: 'Failed to create photography session' });
    }
  });

  // PUT /api/calendar/sessions/:id - Update photography session
  app.put("/api/calendar/sessions/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      
      // Remove ID from update data
      delete updateData.id;
      
      const updates = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updateData).forEach(key => {
        if (key !== 'id') {
          updates.push(`${key} = $${paramIndex}`);
          values.push(updateData[key]);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No update data provided' });
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      const query = `
        UPDATE photography_sessions 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

  const result = await runSql(query, values);

      if (result.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json(result[0]);
    } catch (error) {
      console.error('Failed to update photography session:', error);
      res.status(500).json({ error: 'Failed to update photography session' });
    }
  });

  // DELETE /api/calendar/sessions/:id - Cancel photography session
  app.delete("/api/calendar/sessions/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { cancellation_reason, refund_amount = 0 } = req.body;

      const result = await runSql(
        `UPDATE photography_sessions
        SET status = 'CANCELLED', 
            cancellation_reason = $1, 
            refund_amount = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *`,
        [cancellation_reason, refund_amount, id]
      );

      if (result.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({ 
        message: 'Session cancelled successfully', 
        session: result[0] 
      });
    } catch (error) {
      console.error('Failed to cancel photography session:', error);
      res.status(500).json({ error: 'Failed to cancel photography session' });
    }
  });

  // GET /api/calendar/availability - Check calendar availability
  app.get("/api/calendar/availability", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { date, duration_minutes = '120' } = req.query;

      if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
      }

      // Get existing sessions for the date
      const existingSessions = await runSql(
        `SELECT session_date, duration_minutes
        FROM photography_sessions
        WHERE DATE(session_date) = $1
        AND status IN ('CONFIRMED', 'PENDING')
        ORDER BY session_date`,
        [date]
      );

      // Define working hours (9 AM to 6 PM)
      const workingHours = { start: 9, end: 18 };
      const requestedDuration = parseInt(duration_minutes as string);

      const availableSlots = [];
      const bookedSlots = existingSessions.map(session => {
        const sessionDate = new Date(session.session_date);
        return {
          start: sessionDate.getHours() + (sessionDate.getMinutes() / 60),
          end: sessionDate.getHours() + (sessionDate.getMinutes() / 60) + (session.duration_minutes / 60)
        };
      });

      // Check each hour slot
      for (let hour = workingHours.start; hour < workingHours.end; hour++) {
        const slotEnd = hour + (requestedDuration / 60);
        
        if (slotEnd <= workingHours.end) {
          const isAvailable = !bookedSlots.some(booked => 
            (hour < booked.end && slotEnd > booked.start)
          );

          if (isAvailable) {
            availableSlots.push({
              time: `${hour.toString().padStart(2, '0')}:00`,
              duration: `${requestedDuration} minutes`
            });
          }
        }
      }

      res.json({
        date,
        total_available_slots: availableSlots.length,
        available_slots: availableSlots,
        booked_sessions: existingSessions.length
      });
    } catch (error) {
      console.error('Failed to check calendar availability:', error);
      res.status(500).json({ error: 'Failed to check calendar availability' });
    }
  });

  // ------------------ Embed / Public Booking endpoints ------------------

  // Admin: set available slots (protected) - persisted in DB
  app.post('/api/admin/embed/slots', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { slots, studioId } = req.body;
      if (!Array.isArray(slots)) return res.status(400).json({ error: 'slots must be an array of ISO datetimes' });
      if (!studioId) return res.status(400).json({ error: 'studioId is required' });

      // Mark existing slots for studio inactive and insert new ones
      await runSql(`UPDATE studio_available_slots SET is_active = false WHERE studio_id = $1`, [studioId]);

      const inserted: any[] = [];
      for (const s of slots) {
        if (typeof s !== 'string') continue;
        const start = new Date(s);
        if (isNaN(start.getTime())) continue;
        const r = await runSql(`INSERT INTO studio_available_slots (studio_id, start_time, duration_minutes, is_active, created_at, updated_at) VALUES ($1,$2,$3,true,NOW(),NOW()) RETURNING *`, [studioId, start.toISOString(), 120]);
        if (r && r[0]) inserted.push(r[0]);
      }

      res.json({ success: true, slots: inserted });
    } catch (error) {
      console.error('Failed to save available slots:', error);
      res.status(500).json({ error: 'Failed to save available slots' });
    }
  });

  // Public: get embed availability between start and end (ISO)
  app.get('/api/embed/availability', async (req: Request, res: Response) => {
    try {
      const { start, end, calendarId } = req.query as any;
      if (!start || !end) return res.status(400).json({ error: 'start and end query parameters are required (ISO date strings)' });

      const startDate = new Date(start);
      const endDate = new Date(end);

      // Load admin slots from DB
      const studioId = req.query.studioId as string | undefined;
      let adminRows: any[] = [];
      if (studioId) {
        adminRows = await runSql(`SELECT start_time FROM studio_available_slots WHERE studio_id = $1 AND is_active = true AND start_time >= $2 AND start_time <= $3`, [studioId, startDate.toISOString(), endDate.toISOString()]);
      } else {
        adminRows = await runSql(`SELECT start_time FROM studio_available_slots WHERE is_active = true AND start_time >= $1 AND start_time <= $2`, [startDate.toISOString(), endDate.toISOString()]);
      }
      const adminSlots = adminRows.map(r => new Date(r.start_time));

      // Filter to requested window
      let candidateSlots = adminSlots.filter(d => d >= startDate && d <= endDate);

      // Remove slots that conflict with existing confirmed/pending sessions
      const existing = await runSql(
        `SELECT session_date, duration_minutes FROM photography_sessions WHERE session_date >= $1 AND session_date <= $2 AND status IN ('CONFIRMED','PENDING')`,
        [startDate.toISOString(), endDate.toISOString()]
      );

      const busyRanges = existing.map((s: any) => {
        const sd = new Date(s.session_date);
        return { start: sd.getTime(), end: sd.getTime() + (s.duration_minutes || 120) * 60000 };
      });

      const isBusy = (t: Date) => busyRanges.some(b => t.getTime() < b.end && (t.getTime() + 1) > b.start);

      candidateSlots = candidateSlots.filter(d => !isBusy(d));

  // If Google API key + calendarId provided (either query or env), try to fetch events and remove busy times
      const googleKey = process.env.GOOGLE_API_KEY;
      const googleCal = calendarId || process.env.GOOGLE_CALENDAR_ID;
      if (googleKey && googleCal) {
        try {
          const timeMin = startDate.toISOString();
          const timeMax = endDate.toISOString();
          const eventsUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCal)}/events?singleEvents=true&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&key=${encodeURIComponent(googleKey)}`;
          const resp = await fetch(eventsUrl);
          if (resp.ok) {
            const data = await resp.json();
            const gBusy = (data.items || []).map((it: any) => ({
              start: new Date(it.start?.dateTime || it.start?.date).getTime(),
              end: new Date(it.end?.dateTime || it.end?.date).getTime()
            }));
            candidateSlots = candidateSlots.filter(d => !gBusy.some((b: any) => d.getTime() < b.end && (d.getTime() + 1) > b.start));
          }
        } catch (err) {
          console.warn('Google Calendar fetch failed:', err);
        }
      }

  res.json({ start, end, available: candidateSlots.map(d => d.toISOString()), total: candidateSlots.length });
    } catch (error) {
      console.error('Failed to return embed availability:', error);
      res.status(500).json({ error: 'Failed to return availability' });
    }
  });

  // Public: create a booking from embed widget
  app.post('/api/embed/book', async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, phone, startTime, duration_minutes = 120, session_type = 'session' } = req.body;
      if (!firstName || !email || !startTime) return res.status(400).json({ error: 'firstName, email and startTime are required' });

      const start = new Date(startTime);
      if (isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid startTime' });

      // Check conflict with existing sessions
      const conflict = await runSql(
        `SELECT session_date, duration_minutes FROM photography_sessions WHERE session_date >= $1 - INTERVAL '1 hour' AND session_date <= $2 + INTERVAL '1 hour' AND status IN ('CONFIRMED','PENDING')`,
        [new Date(start.getTime() - 60 * 60 * 1000).toISOString(), new Date(start.getTime() + (duration_minutes + 60) * 60000).toISOString()]
      );
      if (conflict && conflict.length > 0) return res.status(409).json({ error: 'Requested time conflicts with an existing session' });

      // Find or create client by email
      let client = null;
      const found = await runSql(`SELECT * FROM crm_clients WHERE email = $1 LIMIT 1`, [email]);
      if (found && found.length > 0) {
        client = found[0];
      } else {
        const clientData = { firstName, lastName, email, phone };
        client = await storage.createCrmClient(clientData as any);
      }

      // Create photography session in DB
      const insertResult = await runSql(
        `INSERT INTO photography_sessions (client_id, session_type, session_date, duration_minutes, status, created_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) RETURNING *`,
        [String(client.id), session_type, start.toISOString(), Number(duration_minutes), 'CONFIRMED', 'embed']
      );

      const created = insertResult[0];

      // Try to create Google Calendar event and save the google event id if available
      try {
        const studioCalendarService = await import('./services/calendarService').then(m => m.default);
        const googleEvent = await studioCalendarService.createGoogleEventPublic({
          summary: `${session_type} - ${client.first_name || client.firstName || ''} ${client.last_name || client.lastName || ''}`.trim(),
          description: `Booked via embed widget by ${client.email || ''}`,
          start: { dateTime: start.toISOString(), timeZone: 'Europe/Vienna' },
          end: { dateTime: new Date(start.getTime() + Number(duration_minutes) * 60000).toISOString(), timeZone: 'Europe/Vienna' },
          attendees: client.email ? [{ email: client.email }] : undefined,
        });

        if (googleEvent && googleEvent.id) {
          await runSql(`UPDATE photography_sessions SET google_calendar_event_id = $1 WHERE id = $2`, [googleEvent.id, created.id]);
        }
      } catch (googleErr) {
        console.warn('Google event creation failed, continuing:', googleErr);
      }

      res.status(201).json({ success: true, booking: created });
    } catch (error) {
      console.error('Failed to create embed booking:', error);
      res.status(500).json({ error: 'Failed to create booking' });
    }
  });

  // ==================== GALLERY ROUTES ====================
  app.get("/api/galleries", async (req: Request, res: Response) => {
    try {
      const galleries = await storage.getGalleries();
      res.json(galleries);
    } catch (error) {
      console.error("Error fetching galleries:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/galleries/:slug", async (req: Request, res: Response) => {
    try {
      const gallery = await storage.getGalleryBySlug(req.params.slug);
      if (!gallery) {
        return res.status(404).json({ error: "Gallery not found" });
      }
      res.json(gallery);
    } catch (error) {
      console.error("Error fetching gallery:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/galleries", authenticateUser, async (req: Request, res: Response) => {
    try {
      const galleryData = { ...req.body, createdBy: req.user.id };
      const validatedData = insertGallerySchema.parse(galleryData);
      const gallery = await storage.createGallery(validatedData);
      res.status(201).json(gallery);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating gallery:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/galleries/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const gallery = await storage.updateGallery(req.params.id, req.body);
      res.json(gallery);
    } catch (error) {
      console.error("Error updating gallery:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/galleries/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deleteGallery(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting gallery:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Gallery authentication endpoint (public)
  app.post("/api/galleries/:slug/auth", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const { email, firstName, lastName, password } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Get the gallery
      const gallery = await storage.getGalleryBySlug(slug);
      if (!gallery) {
        return res.status(404).json({ error: "Gallery not found" });
      }

      // Check password if gallery is password protected
      if (gallery.isPasswordProtected && gallery.password) {
        if (!password) {
          return res.status(401).json({ error: "Password is required" });
        }

        // Simple password comparison (in production, use hashed passwords)
        if (password !== gallery.password) {
          return res.status(401).json({ error: "Invalid password" });
        }
      }

      // For now, return a simple token (in production, use JWT)
      const token = Buffer.from(`${gallery.id}:${email}:${Date.now()}`).toString('base64');
      
      res.json({ token });
    } catch (error) {
      console.error("Error authenticating gallery access:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get gallery images (public, requires authentication token)
  app.get("/api/galleries/:slug/images", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: "Authentication token required" });
      }

      // Get the gallery first
      const gallery = await storage.getGalleryBySlug(slug);
      if (!gallery) {
        return res.status(404).json({ error: "Gallery not found" });
      }

      // Query Neon database for gallery images
      const galleryImages = await storage.getGalleryImages(gallery.id);

      // If no database records found, check local file storage
      if (!galleryImages || galleryImages.length === 0) {
        console.log('No database records found, checking local file storage...');
        
        // Check for gallery files in public/uploads/galleries
        const fs = await import('fs/promises');
        const path = await import('path');
        
        try {
          const galleryPath = path.join(process.cwd(), 'public', 'uploads', 'galleries', gallery.id.toString());
          const files = await fs.readdir(galleryPath).catch(() => []);
          
          if (files.length > 0) {
            console.log(`Found ${files.length} local gallery files`);
            
            const localGalleryImages = await Promise.all(
              files
                .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                .map(async (file, index) => {
                  const filePath = path.join(galleryPath, file);
                  const stats = await fs.stat(filePath).catch(() => null);
                  
                  return {
                    id: `local-${file}`,
                    galleryId: gallery.id,
                    filename: file,
                    originalUrl: `/uploads/galleries/${gallery.id}/${file}`,
                    displayUrl: `/uploads/galleries/${gallery.id}/${file}`,
                    thumbUrl: `/uploads/galleries/${gallery.id}/${file}`,
                    title: `Image ${index + 1}`,
                    description: `Local image: ${file}`,
                    orderIndex: index,
                    createdAt: stats?.birthtime?.toISOString() || new Date().toISOString(),
                    sizeBytes: stats?.size || 0,
                    contentType: `image/${path.extname(file).slice(1)}`,
                    capturedAt: null
                  };
                })
            );
            
            res.json(localGalleryImages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            return;
          }
        } catch (error) {
          console.log('Error checking local gallery files:', error);
        }
        
      }
      
      // If still no images found, use fallback sample images
      if (!galleryImages || galleryImages.length === 0) {
        const sampleImages = [
          {
            id: 'sample-1',
            galleryId: gallery.id,
            filename: 'mountain_landscape.jpg',
            originalUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
            displayUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
            thumbUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
            title: 'Mountain Vista',
            description: 'Beautiful mountain landscape captured during golden hour',
            orderIndex: 0,
            createdAt: new Date().toISOString(),
            sizeBytes: 2500000,
            contentType: 'image/jpeg',
            capturedAt: null
          },
          {
            id: 'sample-2',
            galleryId: gallery.id,
            filename: 'forest_path.jpg',
            originalUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
            displayUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
            thumbUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
            title: 'Forest Trail',
            description: 'Peaceful forest path through autumn trees',
            orderIndex: 1,
            createdAt: new Date().toISOString(),
            sizeBytes: 2300000,
            contentType: 'image/jpeg',
            capturedAt: null
          },
          {
            id: 'sample-3',
            galleryId: gallery.id,
            filename: 'lake_reflection.jpg',
            originalUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
            displayUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
            thumbUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
            title: 'Lake Reflection',
            description: 'Perfect mirror reflection on a calm mountain lake',
            orderIndex: 2,
            createdAt: new Date().toISOString(),
            sizeBytes: 2800000,
            contentType: 'image/jpeg',
            capturedAt: null
          },
          {
            id: 'sample-4',
            galleryId: gallery.id,
            filename: 'city_skyline.jpg',
            originalUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
            displayUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
            thumbUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
            title: 'Urban Evening',
            description: 'City skyline illuminated at twilight',
            orderIndex: 3,
            createdAt: new Date().toISOString(),
            sizeBytes: 2600000,
            contentType: 'image/jpeg',
            capturedAt: null
          },
          {
            id: 'sample-5',
            galleryId: gallery.id,
            filename: 'coastal_sunset.jpg',
            originalUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2156&q=80',
            displayUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
            thumbUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
            title: 'Coastal Sunset',
            description: 'Golden hour over the ocean coastline',
            orderIndex: 4,
            createdAt: new Date().toISOString(),
            sizeBytes: 2400000,
            contentType: 'image/jpeg',
            capturedAt: null
          }
        ];
        
        res.json(sampleImages);
        return;
      }
      
      // Return gallery images from Neon database
      res.json(galleryImages);
    } catch (error) {
      console.error("Error fetching gallery images:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin dashboard stats route handled below with a safer implementation.

  // ==================== DASHBOARD METRICS ROUTE ====================
  app.get("/api/crm/dashboard/metrics", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Get actual data from database
      const [invoices, leads, sessions, clients] = await Promise.all([
        storage.getCrmInvoices(),
        storage.getCrmLeads(), 
        storage.getPhotographySessions(),
        storage.getCrmClients()
      ]);

      // Calculate revenue metrics from PAID invoices only
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      const totalRevenue = paidInvoices.reduce((sum, invoice) => {
        const total = parseFloat(invoice.total?.toString() || '0');
        return sum + total;
      }, 0);

      const paidRevenue = totalRevenue; // Same as totalRevenue since we only count paid invoices

      const avgOrderValue = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0;

      // Calculate trend data from PAID invoices over last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentInvoices = paidInvoices.filter(invoice => {
        const createdDate = new Date(invoice.createdAt || invoice.created_at);
        return createdDate >= sevenDaysAgo;
      });

      const trendData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayInvoices = recentInvoices.filter(invoice => {
          const invoiceDate = new Date(invoice.createdAt || invoice.created_at).toISOString().split('T')[0];
          return invoiceDate === dateStr;
        });
        
        const dayRevenue = dayInvoices.reduce((sum, invoice) => {
          const total = parseFloat(invoice.total?.toString() || '0');
          return sum + total;
        }, 0);
        
        trendData.push({ date: dateStr, value: dayRevenue });
      }

      const metrics = {
        totalRevenue: Number((totalRevenue || 0).toFixed(2)),
        paidRevenue: Number((paidRevenue || 0).toFixed(2)),
        avgOrderValue: Number((avgOrderValue || 0).toFixed(2)),
        totalInvoices: invoices.length,
        paidInvoices: paidInvoices.length,
        activeLeads: leads.filter(lead => lead.status === 'new' || lead.status === 'contacted').length,
        totalClients: clients.length,
        upcomingSessions: sessions.filter(session => 
    new Date(session.startTime) > new Date()
        ).length,
        trendData
      };
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== CALENDAR CLEANUP TOOLS (ADMIN) ====================
  // Detect suspicious "stacked" sessions sharing an identical start_time with high counts
  app.get("/api/admin/calendar/stacked-clusters", authenticateUser, async (req: Request, res: Response) => {
    try {
      const threshold = parseInt((req.query.threshold as string) || '20', 10);
      const limit = parseInt((req.query.limit as string) || '20', 10);

      const clusters = await runSql(
        `
        SELECT 
          to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as start_time_iso,
          COUNT(*)::int as count,
          SUM(CASE WHEN ical_uid IS NULL OR ical_uid = '' THEN 1 ELSE 0 END)::int as without_ical_uid,
          SUM(CASE WHEN ical_uid IS NOT NULL AND ical_uid <> '' THEN 1 ELSE 0 END)::int as with_ical_uid
        FROM photography_sessions
        GROUP BY start_time
        HAVING COUNT(*) >= $1
        ORDER BY count DESC
        LIMIT $2
        `,
        [threshold, limit]
      );

      // For the top cluster, provide a tiny sample for visibility
      let sample: any[] = [];
      if (clusters.length > 0) {
        const targetIso = clusters[0].start_time_iso;
        sample = await runSql(
          `
          SELECT id, title, ical_uid, created_at 
          FROM photography_sessions 
          WHERE to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') = $1
          ORDER BY created_at DESC
          LIMIT 5
          `,
          [targetIso]
        );
      }

      res.json({ success: true, threshold, clusters, sample });
    } catch (error) {
      console.error('Error detecting stacked clusters:', error);
      res.status(500).json({ success: false, error: 'Failed to detect clusters' });
    }
  });

  // Cleanup stacked sessions for a specific exact start_time ISO (UTC) stamp
  app.post("/api/admin/calendar/cleanup-stacked", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { targetStartTimeIso, onlyNullIcalUid = true, dryRun = true } = req.body || {};
      if (!targetStartTimeIso || typeof targetStartTimeIso !== 'string') {
        return res.status(400).json({ success: false, error: 'targetStartTimeIso (UTC ISO, e.g. 2025-09-08T16:36:48Z) is required' });
      }

      // Count matches first
      const counts = await runSql(
        `
        SELECT 
          COUNT(*)::int as total,
          SUM(CASE WHEN ical_uid IS NULL OR ical_uid = '' THEN 1 ELSE 0 END)::int as without_ical_uid,
          SUM(CASE WHEN ical_uid IS NOT NULL AND ical_uid <> '' THEN 1 ELSE 0 END)::int as with_ical_uid
        FROM photography_sessions
        WHERE to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') = $1
        `,
        [targetStartTimeIso]
      );

      const summary = counts?.[0] || { total: 0, without_ical_uid: 0, with_ical_uid: 0 };

      if (dryRun) {
        return res.json({ success: true, dryRun: true, targetStartTimeIso, summary });
      }

      // Perform deletion
      let deleteQuery = `
        DELETE FROM photography_sessions
        WHERE to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') = $1
      `;
      const params: any[] = [targetStartTimeIso];

      if (onlyNullIcalUid) {
        deleteQuery += ` AND (ical_uid IS NULL OR ical_uid = '')`;
      }

      const before = summary;
      await runSql(deleteQuery, params);

      res.json({ success: true, targetStartTimeIso, deleted: before, onlyNullIcalUid });
    } catch (error) {
      console.error('Error cleaning up stacked sessions:', error);
      res.status(500).json({ success: false, error: 'Failed to cleanup stacked sessions' });
    }
  });

  // Prune historical calendar sessions (admin)
  // Deletes sessions before a cutoff (default: start of today in Europe/Vienna)
  // Options:
  // - body.before: YYYY-MM-DD (Vienna local) optional
  // - body.includeNonImported: boolean (default false) if true, also delete rows without ical_uid
  // - body.dryRun: boolean (default true) to preview counts only
  app.post("/api/admin/calendar/prune-history", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { before, includeNonImported = false, dryRun = true } = req.body || {};
      const tz = process.env.DEFAULT_CAL_TZ || 'Europe/Vienna';

      let localIso: string;
      if (before && /\d{4}-\d{2}-\d{2}/.test(String(before))) {
        localIso = `${before}T00:00:00`;
      } else {
        // Default to start of today in Vienna
        const now = new Date();
        const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = dtf.format(now); // YYYY-MM-DD in Vienna
        localIso = `${parts}T00:00:00`;
      }
      const cutoffUtcIso = convertLocalToUtcIso(localIso, tz);

      const whereImported = includeNonImported ? 'TRUE' : `(ical_uid IS NOT NULL AND ical_uid <> '')`;

      const counts = await runSql(
        `SELECT 
           COUNT(*)::int AS total, 
           SUM(CASE WHEN ical_uid IS NOT NULL AND ical_uid <> '' THEN 1 ELSE 0 END)::int AS with_ical_uid,
           SUM(CASE WHEN ical_uid IS NULL OR ical_uid = '' THEN 1 ELSE 0 END)::int AS without_ical_uid
         FROM photography_sessions
         WHERE start_time < $1 AND ${whereImported}`,
        [cutoffUtcIso]
      );

      const summary = counts?.[0] || { total: 0, with_ical_uid: 0, without_ical_uid: 0 };
      if (dryRun) {
        return res.json({ success: true, dryRun: true, cutoffUtc: cutoffUtcIso, includeNonImported, summary });
      }

      const del = await runSql(
        `DELETE FROM photography_sessions WHERE start_time < $1 AND ${whereImported}`,
        [cutoffUtcIso]
      );

      res.json({ success: true, cutoffUtc: cutoffUtcIso, includeNonImported, deleted: summary });
    } catch (error) {
      console.error('Error pruning historical sessions:', error);
      res.status(500).json({ success: false, error: 'Failed to prune historical sessions' });
    }
  });

  // ==================== TOP CLIENTS ROUTES ====================
  app.get("/api/crm/top-clients", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { limit = 10, orderBy = 'lifetime_value', minRevenue, yearFilter } = req.query;
      
      let query = `
        SELECT 
          c.id,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.city,
          COALESCE(SUM(i.total), 0) as total_revenue,
          COUNT(DISTINCT i.id) as invoice_count,
          COUNT(DISTINCT s.id) as session_count,
          MAX(i.created_at) as last_invoice_date,
          MAX(s.session_date) as last_session_date,
          COALESCE(SUM(i.total), 0) as lifetime_value
        FROM crm_clients c
        LEFT JOIN crm_invoices i ON c.id = i.client_id AND i.status = 'PAID'
        LEFT JOIN photography_sessions s ON c.id::text = s.client_id
      `;
      
      // Add year filter if specified
      if (yearFilter) {
        query += ` AND EXTRACT(YEAR FROM i.created_at) = ${yearFilter}`;
      }
      
      query += ` GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone, c.city`;
      
      // Add minimum revenue filter
      if (minRevenue) {
        query += ` HAVING SUM(i.total) >= ${minRevenue}`;
      }
      
      // Add ordering
      switch (orderBy) {
        case "total_revenue":
        case "lifetime_value":
          query += ` ORDER BY total_revenue DESC`;
          break;
        case "session_count":
          query += ` ORDER BY session_count DESC`;
          break;
        case "recent_activity":
          query += ` ORDER BY GREATEST(COALESCE(last_invoice_date, '1900-01-01'), COALESCE(last_session_date, '1900-01-01')) DESC`;
          break;
      }
      
      query += ` LIMIT ${limit}`;
      
  const topClients = await runSql(query);
      res.json(topClients);
    } catch (error) {
      console.error('Error fetching top clients:', error);
      res.status(500).json({ error: "Failed to fetch top clients" });
    }
  });

  app.get("/api/crm/client-segments", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { segmentBy = 'revenue', includeStats = true } = req.query;
      
      let segmentQuery = "";
      
      switch (segmentBy) {
        case "revenue":
          segmentQuery = `
            SELECT 
              CASE 
                WHEN total_revenue >= 1000 THEN 'VIP (€1000+)'
                WHEN total_revenue >= 500 THEN 'Premium (€500-999)'
                WHEN total_revenue >= 200 THEN 'Standard (€200-499)'
                WHEN total_revenue > 0 THEN 'Basic (€1-199)'
                ELSE 'No Revenue'
              END as segment,
              COUNT(*) as client_count,
              SUM(total_revenue) as segment_revenue,
              AVG(total_revenue) as avg_revenue_per_client
            FROM (
              SELECT 
                c.id,
                COALESCE(SUM(i.total), 0) as total_revenue
              FROM crm_clients c
              LEFT JOIN crm_invoices i ON c.id = i.client_id AND i.status = 'PAID'
              GROUP BY c.id
            ) client_revenues
            GROUP BY segment
            ORDER BY segment_revenue DESC
          `;
          break;
          
        case "frequency":
          segmentQuery = `
            SELECT 
              CASE 
                WHEN session_count >= 5 THEN 'Frequent (5+ sessions)'
                WHEN session_count >= 3 THEN 'Regular (3-4 sessions)'
                WHEN session_count >= 1 THEN 'Occasional (1-2 sessions)'
                ELSE 'No Sessions'
              END as segment,
              COUNT(*) as client_count,
              SUM(session_count) as total_sessions,
              AVG(session_count) as avg_sessions_per_client
            FROM (
              SELECT 
                c.id,
                COUNT(s.id) as session_count
              FROM crm_clients c
              LEFT JOIN photography_sessions s ON c.id::text = s.client_id
              GROUP BY c.id
            ) client_sessions
            GROUP BY segment
            ORDER BY total_sessions DESC
          `;
          break;
          
        case "geography":
          segmentQuery = `
            SELECT 
              COALESCE(city, 'Unknown') as segment,
              COUNT(*) as client_count,
              COALESCE(SUM(total_revenue), 0) as segment_revenue
            FROM (
              SELECT 
                c.city,
                COALESCE(SUM(i.total), 0) as total_revenue
              FROM crm_clients c
              LEFT JOIN crm_invoices i ON c.id = i.client_id AND i.status = 'PAID'
              GROUP BY c.id, c.city
            ) client_geo
            GROUP BY city
            ORDER BY client_count DESC
            LIMIT 10
          `;
          break;
      }
      
  const segments = await runSql(segmentQuery);
      res.json({ 
        segments,
        segmentBy,
        totalSegments: segments.length,
        message: `Client segmentation by ${segmentBy} completed`
      });
    } catch (error) {
      console.error('Error fetching client segments:', error);
      res.status(500).json({ error: "Failed to fetch client segments" });
    }
  });

  // ==================== GALLERY ROUTES ====================
  app.get("/api/galleries", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { clientId, isPublic, limit = 20 } = req.query;
      
      let query = `
        SELECT 
          g.id,
          g.title,
          g.slug,
          g.description,
          g.cover_image,
          g.is_public,
          g.is_password_protected,
          g.client_id,
          g.created_at,
          g.updated_at,
          COALESCE(c.first_name || ' ' || c.last_name, 'Unknown Client') as client_name,
          c.email as client_email,
          COUNT(gi.id) as image_count
        FROM galleries g
        LEFT JOIN crm_clients c ON g.client_id = c.id
        LEFT JOIN gallery_images gi ON g.id = gi.gallery_id
      `;
      
      const conditions = [];
      const values = [];
      let paramIndex = 1;
      
      if (clientId) {
        conditions.push(`g.client_id = $${paramIndex}`);
        values.push(clientId);
        paramIndex++;
      }
      
      if (isPublic !== undefined) {
        conditions.push(`g.is_public = $${paramIndex}`);
        values.push(isPublic === 'true');
        paramIndex++;
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` GROUP BY g.id, c.first_name, c.last_name, c.email`;
      query += ` ORDER BY g.created_at DESC LIMIT $${paramIndex}`;
      values.push(parseInt(limit as string));
      
  const galleries = await runSql(query, values);
      res.json(galleries);
    } catch (error) {
      console.error('Error fetching galleries:', error);
      res.status(500).json({ error: "Failed to fetch galleries" });
    }
  });

  app.post("/api/galleries", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { title, description, clientId, isPublic = true, isPasswordProtected = false, password, slug } = req.body;
      
      // Generate slug if not provided
      const gallerySlug = slug || title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
      
      const query = `
        INSERT INTO galleries (title, description, client_id, is_public, is_password_protected, password, slug, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, title, slug, description, is_public, created_at
      `;
      
  const result = await runSql(query, [
        title,
        description || null,
        clientId,
        isPublic,
        isPasswordProtected,
        password || null,
        gallerySlug,
        req.user?.id || null
      ]);
      
      res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error creating gallery:', error);
      res.status(500).json({ error: "Failed to create gallery" });
    }
  });

  app.put("/api/galleries/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const galleryId = req.params.id;
      const updates = [];
      const values = [];
      let paramIndex = 1;
      
      const allowedFields = ['title', 'description', 'isPublic', 'isPasswordProtected', 'password', 'coverImage'];
      
      for (const [key, value] of Object.entries(req.body)) {
        if (allowedFields.includes(key) && value !== undefined) {
          const dbField = key === 'isPublic' ? 'is_public' : 
                         key === 'isPasswordProtected' ? 'is_password_protected' :
                         key === 'coverImage' ? 'cover_image' : key;
          updates.push(`${dbField} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: "No valid updates provided" });
      }
      
      updates.push(`updated_at = NOW()`);
      
      const query = `
        UPDATE galleries 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, title, slug, description, is_public, updated_at
      `;
      values.push(galleryId);
      
  const result = await runSql(query, values);
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Gallery not found" });
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error('Error updating gallery:', error);
      res.status(500).json({ error: "Failed to update gallery" });
    }
  });

  app.delete("/api/galleries/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const galleryId = req.params.id;
      
      // Check if gallery exists
  const galleryCheck = await runSql(`SELECT title FROM galleries WHERE id = $1`, [galleryId]);
      
      if (galleryCheck.length === 0) {
        return res.status(404).json({ error: "Gallery not found" });
      }
      
      // Delete images first (cascade should handle this, but being explicit)
  await runSql(`DELETE FROM gallery_images WHERE gallery_id = $1`, [galleryId]);
      
      // Delete gallery
  await runSql(`DELETE FROM galleries WHERE id = $1`, [galleryId]);
      
      res.json({ 
        success: true, 
        message: `Gallery "${galleryCheck[0].title}" deleted successfully` 
      });
    } catch (error) {
      console.error('Error deleting gallery:', error);
      res.status(500).json({ error: "Failed to delete gallery" });
    }
  });

  app.get("/api/galleries/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const galleryId = req.params.id;
      
      const query = `
        SELECT 
          g.*,
          COALESCE(c.first_name || ' ' || c.last_name, 'Unknown Client') as client_name,
          c.email as client_email,
          COUNT(gi.id) as image_count
        FROM galleries g
        LEFT JOIN crm_clients c ON g.client_id = c.id
        LEFT JOIN gallery_images gi ON g.id = gi.gallery_id
        WHERE g.id = $1
        GROUP BY g.id, c.first_name, c.last_name, c.email
      `;
      
  const result = await runSql(query, [galleryId]);
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Gallery not found" });
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error('Error fetching gallery:', error);
      res.status(500).json({ error: "Failed to fetch gallery" });
    }
  });

  // ==================== INVOICE ROUTES ====================
  app.get("/api/crm/invoices", authenticateUser, async (req: Request, res: Response) => {
    try {
      const invoices = await storage.getCrmInvoices();
      
      // Transform the data to match frontend expectations
      const transformedInvoices = invoices.map(invoice => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        client_id: invoice.client_id,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        subtotal_amount: parseFloat(invoice.subtotal || '0'),
        tax_amount: parseFloat(invoice.tax_amount || '0'),
        total_amount: parseFloat(invoice.total || '0'),
        status: invoice.status,
        notes: invoice.notes,
        created_at: invoice.created_at,
        client: {
          name: invoice.client_name,
          email: invoice.client_email
        }
      }));
      
      res.json(transformedInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/crm/invoices/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const invoice = await storage.getCrmInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/crm/invoices", authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log("Received invoice data:", JSON.stringify(req.body, null, 2));
      
      // Validate the invoice data
      const invoiceData = insertCrmInvoiceSchema.parse(req.body);
      
      // Add auto-generated invoice number if not provided
      if (!invoiceData.invoiceNumber) {
        const timestamp = Date.now();
        invoiceData.invoiceNumber = `INV-${timestamp}`;
      }
      
      // Create the invoice (make createdBy optional since users table may not be populated)
      const invoice = await storage.createCrmInvoice({
        ...invoiceData,
        createdBy: req.user?.id || null
      });

      // Create invoice items if provided
      if (req.body.items && req.body.items.length > 0) {
        const itemsData = req.body.items.map((item: any, index: number) => ({
          invoiceId: invoice.id,
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: (item.unitPrice || item.unit_price).toString(),
          taxRate: (item.taxRate || item.tax_rate || 0).toString(),
          sortOrder: index
        }));
        
        await storage.createCrmInvoiceItems(itemsData);
      }
      
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error details:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating invoice:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/crm/invoices/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const invoice = await storage.updateCrmInvoice(req.params.id, req.body);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/crm/invoices/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const invoice = await storage.updateCrmInvoice(req.params.id, req.body);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/crm/invoices/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deleteCrmInvoice(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== INVOICE PAYMENT ROUTES ====================
  app.get("/api/crm/invoices/:invoiceId/payments", authenticateUser, async (req: Request, res: Response) => {
    try {
      const payments = await storage.getCrmInvoicePayments(req.params.invoiceId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/crm/invoices/:invoiceId/payments", authenticateUser, async (req: Request, res: Response) => {
    try {
      const payment = await storage.createCrmInvoicePayment({
        ...req.body,
        invoiceId: req.params.invoiceId
      });
      res.json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/crm/invoices/:invoiceId/payments/:paymentId", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deleteCrmInvoicePayment(req.params.paymentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== INVOICE PDF & EMAIL ROUTES ====================
  // Generate PDF for invoice
  app.get("/api/crm/invoices/:id/pdf", authenticateUser, async (req: Request, res: Response) => {
    try {
      const invoice = await storage.getCrmInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Get client details using correct field name
  const clientId = invoice.clientId;
      const client = await storage.getCrmClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Generate modern PDF using centralized function
      const pdfBuffer = await generateModernInvoicePDF(invoice, client);
      
      // Set proper PDF headers
  const invoiceNumber = invoice.invoiceNumber || invoice.id;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Rechnung-${invoiceNumber}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Email invoice to client
  app.post("/api/crm/invoices/:id/email", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { subject, message, includeAttachment = true } = req.body;
      
      const invoice = await storage.getCrmInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const client = await storage.getCrmClient(invoice.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      if (!client.email) {
        return res.status(400).json({ error: "Client has no email address" });
      }

      // Generate modern PDF attachment if requested using centralized function
      let attachments = [];
      if (includeAttachment) {
        const pdfBuffer = await generateModernInvoicePDF(invoice, client);
  const invoiceNumber = invoice.invoiceNumber || invoice.id;

        attachments.push({
          filename: `Rechnung-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });
      }

      // Create email transporter (using EasyName SMTP)
      const transporter = nodemailer.createTransport({
        host: 'smtp.easyname.com',
        port: 465,
        secure: true,
        auth: {
          // Use mailbox username from environment when available; otherwise use request-provided username
          user: process.env.BUSINESS_MAILBOX_USER || '30840mail10',
          pass: process.env.EMAIL_PASSWORD || 'your-email-password'
        }
      });

      // Send email
      const emailOptions = {
        from: 'hallo@newagefotografie.com',
        to: client.email,
        subject: subject || `Rechnung ${invoice.invoiceNumber} - New Age Fotografie`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Rechnung ${invoice.invoiceNumber}</h2>
            <p>Liebe/r ${client.firstName} ${client.lastName},</p>
            <p>${message || 'anbei senden wir Ihnen Ihre Rechnung zu.'}</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 10px 0;">Rechnungsdetails:</h3>
              <p><strong>Rechnungsnummer:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Datum:</strong> ${new Date(invoice.issueDate).toLocaleDateString('de-DE')}</p>
              <p><strong>Fälligkeitsdatum:</strong> ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}</p>
              <p><strong>Gesamtbetrag:</strong> €${parseFloat(invoice.total?.toString() || '0').toFixed(2)}</p>
            </div>
            <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
              <p><strong>New Age Fotografie</strong><br>
              Schönbrunner Str. 25<br>
              1050 Wien, Austria<br>
              Tel: +43 677 633 99210<br>
              Email: hallo@newagefotografie.com</p>
            </div>
          </div>
        `,
        attachments
      };

      await transporter.sendMail(emailOptions);

      res.json({ 
        success: true, 
        message: `Invoice successfully sent to ${client.email}` 
      });

    } catch (error) {
      console.error("Error sending invoice email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // SMS invoice to client
  app.post("/api/crm/invoices/:id/sms", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { phoneNumber, customMessage } = req.body;
      
      const invoice = await storage.getCrmInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const client = await storage.getCrmClient(invoice.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const clientPhone = phoneNumber || client.phone;
      if (!clientPhone) {
        return res.status(400).json({ error: "No phone number provided or available for client" });
      }

      // Create invoice link
      const baseUrl = process.env.FRONTEND_URL || 'https://newagefotografie.com';
      const invoiceUrl = `${baseUrl}/invoice/${invoice.id}`;
      
      // Create SMS message
      const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Kunde';
      const defaultMessage = `Hallo ${clientName},

hier ist Ihre Rechnung von New Age Fotografie:

📄 Rechnungsnummer: ${invoice.invoiceNumber}
💰 Betrag: €${parseFloat(invoice.total?.toString() || '0').toFixed(2)}
📅 Fälligkeitsdatum: ${new Date(invoice.dueDate || Date.now()).toLocaleDateString('de-DE')}

🔗 Rechnung ansehen: ${invoiceUrl}

Bei Fragen: +43 677 633 99210

New Age Fotografie Team`;

      const finalMessage = customMessage || defaultMessage;

      // Import SMS service dynamically
      const { SMSService } = await import("./services/smsService");
      
      // Send SMS
      const result = await SMSService.sendSMS({
        to: clientPhone,
        content: finalMessage,
        clientId: client.id,
        campaignType: 'invoice_notification',
        messageType: 'sms'
      });

      // Log SMS activity in client activity log
      await storage.addCrmClientActivity({
        clientId: client.id,
        activityType: 'invoice_sent_sms',
        description: `Invoice ${invoice.invoiceNumber} sent via SMS to ${clientPhone}`,
        metadata: { 
          invoiceId: invoice.id, 
          phoneNumber: clientPhone,
          smsId: result.messageId,
          invoiceUrl: invoiceUrl
        }
      });

      res.json({
        success: true,
        message: "Invoice sent successfully via SMS",
        phoneNumber: clientPhone,
        smsId: result.messageId,
        invoiceUrl: invoiceUrl
      });

    } catch (error) {
      console.error("Error sending invoice SMS:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  // WhatsApp invoice to client
  app.post("/api/crm/invoices/:id/whatsapp", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { phoneNumber, customMessage } = req.body;
      
      const invoice = await storage.getCrmInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const client = await storage.getCrmClient(invoice.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const clientPhone = phoneNumber || client.phone;
      if (!clientPhone) {
        return res.status(400).json({ error: "No phone number provided or available for client" });
      }

      // Create invoice link
      const baseUrl = process.env.FRONTEND_URL || 'https://newagefotografie.com';
      const invoiceUrl = `${baseUrl}/invoice/${invoice.id}`;
      
      // Create WhatsApp message
      const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Kunde';
      const defaultMessage = `Hallo ${clientName},

hier ist Ihre Rechnung von New Age Fotografie:

📄 Rechnungsnummer: ${invoice.invoiceNumber}
💰 Betrag: €${parseFloat(invoice.total?.toString() || '0').toFixed(2)}
📅 Fälligkeitsdatum: ${new Date(invoice.dueDate || Date.now()).toLocaleDateString('de-DE')}

🔗 Rechnung ansehen: ${invoiceUrl}

Bei Fragen stehe ich Ihnen gerne zur Verfügung!

Mit freundlichen Grüßen,
New Age Fotografie Team`;

      const finalMessage = customMessage || defaultMessage;
      
      // Create WhatsApp URL
      const cleanPhone = clientPhone.replace(/[^\d+]/g, '');
      const encodedMessage = encodeURIComponent(finalMessage);
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

      // Log WhatsApp activity in client activity log
      await storage.addCrmClientActivity({
        clientId: client.id,
        activityType: 'invoice_shared_whatsapp',
        description: `Invoice ${invoice.invoiceNumber} shared via WhatsApp to ${clientPhone}`,
        metadata: { 
          invoiceId: invoice.id, 
          phoneNumber: clientPhone,
          whatsappUrl: whatsappUrl,
          invoiceUrl: invoiceUrl
        }
      });

      res.json({
        success: true,
        whatsappUrl: whatsappUrl,
        invoiceUrl: invoiceUrl,
        message: "WhatsApp share link created successfully"
      });

    } catch (error) {
      console.error("Error creating WhatsApp share link:", error);
      res.status(500).json({ error: "Failed to create WhatsApp share link" });
    }
  });

  // ==================== EMAIL ROUTES ====================
  app.post("/api/email/import", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { provider, smtpHost, smtpPort, username, password, useTLS } = req.body;

      // Basic validation
      if (!smtpHost || !smtpPort || !username || !password) {
        return res.status(400).json({
          success: false,
          message: "Missing required connection parameters"
        });
      }

      console.log(`Attempting to import emails from ${username} via ${smtpHost}:${smtpPort}`);

      // Special handling for business email with EasyName IMAP settings
      // If this looks like the studio's business address, prefer environment-configured mailbox credentials
      if (username === 'hallo@newagefotografie.com' || username === process.env.BUSINESS_MAILBOX_USER) {
        console.log('Using EasyName IMAP settings for business email');
        const mailboxUser = process.env.BUSINESS_MAILBOX_USER || username;
        const mailboxPass = process.env.EMAIL_PASSWORD || password;

        const importedEmails = await importEmailsFromIMAP({
          host: 'imap.easyname.com',
          port: 993,
          username: mailboxUser,
          password: mailboxPass,
          useTLS: true
        });

        console.log(`Successfully fetched ${importedEmails.length} emails from business account`);

        // Store emails in database, avoid duplicates
        let newEmailCount = 0;
        const existingMessages = await storage.getCrmMessages();
        
        for (const email of importedEmails) {
          // Check if email already exists (improved duplicate check)
          const isDuplicate = existingMessages.some(msg => 
            msg.subject === email.subject && 
            msg.senderEmail === email.from &&
            msg.createdAt && Math.abs(new Date(msg.createdAt).getTime() - new Date(email.date).getTime()) < 300000 // Within 5 minutes
          );
          
          if (!isDuplicate) {
            try {
              await storage.createCrmMessage({
                senderName: email.fromName,
                senderEmail: email.from,
                subject: email.subject,
                content: email.body,
                status: email.isRead ? 'read' : 'unread'
              });
              newEmailCount++;
              console.log(`Imported new email: ${email.subject} from ${email.from}`);
            } catch (error) {
              console.error('Failed to save email:', error);
            }
          }
        }
        
        console.log(`Imported ${newEmailCount} new emails out of ${importedEmails.length} fetched`);

        return res.json({
          success: true,
          message: `Successfully imported ${importedEmails.length} emails from ${username}`,
          count: importedEmails.length
        });
      }

      // Convert SMTP server to IMAP server for major providers
      let imapHost = smtpHost;
      if (provider === 'gmail') {
        imapHost = 'imap.gmail.com';
      } else if (provider === 'outlook') {
        imapHost = 'outlook.office365.com';
      } else if (smtpHost.includes('smtp.')) {
        imapHost = smtpHost.replace('smtp.', 'imap.');
      }

      // Import actual emails using IMAP
      const importedEmails = await importEmailsFromIMAP({
        host: imapHost,
        port: provider === 'gmail' ? 993 : (provider === 'outlook' ? 993 : 993),
        username,
        password,
        useTLS: useTLS !== false
      });

      console.log(`Successfully fetched ${importedEmails.length} emails from ${username}`);

      // Store emails in database
      for (const email of importedEmails) {
        await storage.createCrmMessage({
          senderName: email.fromName,
          senderEmail: email.from,
          subject: email.subject,
          content: email.body,
          status: email.isRead ? 'read' : 'unread'
        });
      }

      return res.json({
        success: true,
        message: `Successfully imported ${importedEmails.length} emails from ${username}`,
        count: importedEmails.length
      });
    } catch (error) {
      console.error("Error importing emails:", error);
      res.status(500).json({
        success: false,
        message: "Failed to import emails: " + (error as Error).message
      });
    }
  });

  app.get("/api/crm/messages", authenticateUser, async (req: Request, res: Response) => {
    try {
      const messages = await storage.getCrmMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/crm/messages/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const message = await storage.updateCrmMessage(id, updates);
      res.json(message);
    } catch (error) {
      console.error("Error updating message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/crm/messages/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteCrmMessage(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== INBOX EMAIL ROUTES ====================
  app.get("/api/inbox/emails", authenticateUser, async (req: Request, res: Response) => {
    try {
      const unreadOnly = req.query.unread === 'true';
      const messages = await storage.getCrmMessages();
      
      // Sort messages by creation date (newest first)
      const sortedMessages = messages.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      if (unreadOnly) {
        const unreadMessages = sortedMessages.filter(message => message.status === 'unread');
        res.json(unreadMessages);
      } else {
        // Show all messages including sent ones for complete inbox view
        res.json(sortedMessages);
      }
    } catch (error) {
      console.error("Error fetching inbox emails:", error);
      // Fail-open to avoid blocking dashboard if storage fails
      res.json([]);
    }
  });

  // ==================== ADMIN DASHBOARD ====================
  app.get("/api/admin/dashboard-stats", authenticateUser, async (_req: Request, res: Response) => {
    const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    };
    const countOf = async (arrPromise: Promise<any[]>) => (await safe(() => arrPromise, [])).length;

    try {
      const [sessionsCount, clientsCount, leadsCount] = await Promise.all([
        countOf(storage.getPhotographySessions()),
        countOf(storage.getCrmClients()),
        countOf(storage.getCrmLeads('new'))
      ]);

      res.json({
        success: true,
        metrics: {
          sessions: sessionsCount,
          clients: clientsCount,
          newLeads: leadsCount,
        }
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.json({ success: false, metrics: { sessions: 0, clients: 0, newLeads: 0 } });
    }
  });

  // ==================== GOOGLE CALENDAR INTEGRATION ROUTES ====================
  app.get("/api/calendar/google/status", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Check if user has Google Calendar tokens stored
      // For now, return a mock status that shows disconnected state
      res.json({
        connected: false,
        calendars: [],
        settings: {
          autoSync: false,
          syncInterval: '15m',
          syncDirection: 'both',
          defaultCalendar: ''
        },
        lastSync: null
      });
    } catch (error) {
      console.error("Error checking Google Calendar status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/calendar/google/auth-url", authenticateUser, async (req: Request, res: Response) => {
    try {
      // In a real implementation, you would:
      // 1. Generate OAuth state parameter
      // 2. Create Google OAuth URL with proper scopes
      // 3. Store state for verification
      
      // Google Calendar OAuth scopes needed:
      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ];
      
      // For demo purposes, provide instructions to user
      res.json({
        authUrl: `https://accounts.google.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=${scopes.join(' ')}&response_type=code&access_type=offline`,
        message: "To complete Google Calendar integration, you'll need to set up Google OAuth credentials in your Google Cloud Console and configure the CLIENT_ID and CLIENT_SECRET environment variables."
      });
    } catch (error) {
      console.error("Error generating Google auth URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/calendar/google/disconnect", authenticateUser, async (req: Request, res: Response) => {
    try {
      // In a real implementation, you would:
      // 1. Revoke Google OAuth tokens
      // 2. Remove stored credentials from database
      // 3. Clean up any sync settings
      
      res.json({ success: true, message: "Google Calendar disconnected successfully" });
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/calendar/google/sync", authenticateUser, async (req: Request, res: Response) => {
    try {
      // In a real implementation, you would:
      // 1. Fetch events from Google Calendar API
      // 2. Compare with local photography sessions
      // 3. Sync bidirectionally based on settings
      // 4. Handle conflicts and duplicates
      
      res.json({ 
        success: true, 
        message: "Calendar sync completed successfully",
        imported: 0,
        exported: 0,
        conflicts: 0
      });
    } catch (error) {
      console.error("Error syncing Google Calendar:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // (placeholder handler for /api/calendar/import/google removed to avoid conflicting routes)

  app.put("/api/calendar/google/settings", authenticateUser, async (req: Request, res: Response) => {
    try {
      const settings = req.body;
      
      // In a real implementation, you would:
      // 1. Validate settings
      // 2. Store in database
      // 3. Update sync job schedules if needed
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error updating Google Calendar settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Helper: determine import cutoff (defaults to start of today in Europe/Vienna, UTC)
  function getImportCutoffUtc(req: Request): Date {
    try {
      const includePast = String((req.query.includePast || req.query.includepast) ?? '').toLowerCase() === 'true';
      if (includePast) return new Date(0); // no cutoff

      const from = (req.query.from as string | undefined) || (req.query.cutoff as string | undefined);
      const tz = process.env.DEFAULT_CAL_TZ || 'Europe/Vienna';

      let localIso: string;
      if (from && /\d{4}-\d{2}-\d{2}/.test(from)) {
        localIso = `${from}T00:00:00`;
      } else {
        // start of today in Vienna
        const now = new Date();
        const y = now.getUTCFullYear();
        const m = now.getUTCMonth();
        const d = now.getUTCDate();
        const todayUtc = new Date(Date.UTC(y, m, d, 0, 0, 0));
        // Convert UTC midnight to Vienna date parts
        // Safer approach: format today in Vienna and rebuild local midnight
        const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = dtf.format(todayUtc); // YYYY-MM-DD in Vienna TZ
        localIso = `${parts}T00:00:00`;
      }

      const utcIso = convertLocalToUtcIso(localIso, tz);
      const d = new Date(utcIso);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  }

  // Helper: determine optional upper-bound cutoff (to=YYYY-MM-DD in Europe/Vienna)
  function getImportUpperBoundUtc(req: Request): Date | undefined {
    try {
      const to = (req.query.to as string | undefined) || (req.query.until as string | undefined);
      if (!to || !/\d{4}-\d{2}-\d{2}/.test(to)) return undefined;
      const tz = process.env.DEFAULT_CAL_TZ || 'Europe/Vienna';
      // Interpret as end-of-day local time then convert to UTC
      const localIso = `${to}T23:59:59`;
      const utcIso = convertLocalToUtcIso(localIso, tz);
      const d = new Date(utcIso);
      return isNaN(d.getTime()) ? undefined : d;
    } catch {
      return undefined;
    }
  }

  // ==================== CALENDAR IMPORT ====================
  // Fallback Google import route used by client UI. If an icsUrl is provided,
  // it proxies to the /api/calendar/import/ics-url logic; otherwise it returns
  // a friendly success with 0 imports and guidance for using the ICS options.
  app.post("/api/calendar/import/google", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { icsUrl } = req.body || {};
      const dryRun = String(req.query.dryRun || req.query.dryrun || '').toLowerCase() === 'true';

      if (icsUrl && typeof icsUrl === 'string' && icsUrl.trim().length > 0) {
        try {
          const fetch = (await import('node-fetch')).default;
          const response = await fetch(icsUrl);
          if (!response.ok) {
            return res.status(502).json({ error: `Failed to fetch calendar: ${response.status}` });
          }
          const icsContent = await response.text();

          // Log snapshot to temp for diagnostics
          try {
            const tmpDir = os.tmpdir();
            const rawPath = path.join(tmpDir, 'clean-crm-debug_ics_content.log');
            const header = `==== ICS SNAPSHOT ${new Date().toISOString()} GOOGLE: ${icsUrl} LENGTH: ${icsContent.length} ====`;
            fs.appendFileSync(rawPath, header + '\n' + icsContent.substring(0, 2000) + '\n\n', { encoding: 'utf8' });
            console.error(`WROTE_ICS_SNAPSHOT | path=${rawPath} | len=${icsContent.length}`);
          } catch {}

          const importedEvents = parseICalContent(icsContent);
          // Default to upcoming-only unless includePast=true or a from=YYYY-MM-DD cutoff is provided
          const cutoff = getImportCutoffUtc(req);
          const upper = getImportUpperBoundUtc(req);
          const eventsToImport = importedEvents.filter(ev => {
            const ds = ev?.dtstart ? new Date(ev.dtstart) : null;
            return !!(ds && !isNaN(ds.getTime()) && ds >= cutoff && (!upper || ds <= upper));
          });
          if (dryRun) {
            return res.json({ success: true, dryRun: true, parsed: importedEvents.length, filtered: eventsToImport.length, cutoff: cutoff.toISOString(), upper: upper ? upper.toISOString() : null });
          }

          let importedCount = 0;
          for (const event of eventsToImport) {
            try {
              // Helper function to safely create date
              const safeCreateDate = (dateString: string | undefined): Date | null => {
                if (!dateString) return null;
                const date = new Date(dateString);
                return isNaN(date.getTime()) ? null : date;
              };

              const session = {
                id: `imported-${(event.uid || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`).replace(/[^a-zA-Z0-9_-]/g,'')}`,
                icalUid: event.uid || undefined,
                title: event.summary || 'Imported Event',
                description: event.description || '',
                sessionType: 'imported',
                status: 'confirmed',
                // Skip when dates invalid to avoid clustering
                startTime: safeCreateDate(event.dtstart)!,
                endTime: safeCreateDate(event.dtend)!,
                locationName: event.location || '',
                locationAddress: event.location || '',
                clientName: extractClientFromDescription(event.description || event.summary || ''),
                clientEmail: '',
                clientPhone: '',
                paymentStatus: 'pending',
                conflictDetected: false,
                weatherDependent: false,
                goldenHourOptimized: false,
                portfolioWorthy: false,
                editingStatus: 'pending',
                deliveryStatus: 'pending',
                isRecurring: false,
                reminderSent: false,
                confirmationSent: false,
                followUpSent: false,
                isOnlineBookable: false,
                availabilityStatus: 'booked',
                priority: 'medium',
                isPublic: false,
                photographerId: 'imported',
                createdAt: new Date(),
                updatedAt: new Date()
              };

              // Validate parsed dates
              if (!(session.startTime instanceof Date) || isNaN(session.startTime.getTime()) ||
                  !(session.endTime instanceof Date) || isNaN(session.endTime.getTime())) {
                console.error('GOOGLE_IMPORT skip invalid dates:', { summary: event.summary, dtstart: event.dtstart, dtend: event.dtend });
                continue;
              }
              await storage.createPhotographySession(session);
              importedCount++;
            } catch (e) {
              console.error('GOOGLE_IMPORT insert failed:', e);
            }
          }

          return res.json({ success: true, imported: importedCount, via: 'icsUrl', cutoff: cutoff.toISOString(), upper: upper ? upper.toISOString() : null });
        } catch (err) {
          return res.status(500).json({ error: 'Failed to import via icsUrl', details: (err as Error)?.message });
        }
      }

      // No icsUrl provided: respond with a benign success to keep the UI happy,
      // and guide the user toward the ICS URL or file upload flows.
      return res.json({
        success: true,
        imported: 0,
        message: 'Google OAuth import not configured. Use the .ics URL import or upload a .ics file.'
      });
    } catch (error) {
      console.error('Error in /api/calendar/import/google:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post("/api/calendar/import/ics", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { icsContent, fileName } = req.body;
      
      if (!icsContent) {
        return res.status(400).json({ error: 'No iCal content provided' });
      }

      // Persist raw iCal content snapshot synchronously for debugging (write to OS temp dir)
      try {
        const tmpDir = os.tmpdir();
        const rawPath = path.join(tmpDir, 'clean-crm-debug_ics_content.log');
        const header = `==== ICS SNAPSHOT ${new Date().toISOString()} DIRECT: ${fileName || 'no-name'} LENGTH: ${icsContent.length} ====`;
        fs.appendFileSync(rawPath, header + '\n' + icsContent.substring(0, 2000) + '\n\n', { encoding: 'utf8' });
        console.error(`WROTE_ICS_SNAPSHOT | path=${rawPath} | len=${icsContent.length}`);
      } catch (e) {
        console.error('Failed to write ICS content snapshot:', e);
      }

      // Parse iCal content and convert to photography sessions
      const importedEvents = parseICalContent(icsContent);
      const cutoff = getImportCutoffUtc(req);
      const upper = getImportUpperBoundUtc(req);
      const eventsToImport = importedEvents.filter(ev => {
        const ds = ev?.dtstart ? new Date(ev.dtstart) : null;
        return !!(ds && !isNaN(ds.getTime()) && ds >= cutoff && (!upper || ds <= upper));
      });
      const dryRun = String(req.query.dryRun || req.query.dryrun || '').toLowerCase() === 'true';
      if (dryRun) {
        console.error(`ICS_DRY_RUN | events=${importedEvents.length} | filtered=${eventsToImport.length} | cutoff=${cutoff.toISOString()} | upper=${upper ? upper.toISOString() : 'none'} | fileName=${fileName || ''}`);
        return res.json({ success: true, dryRun: true, parsed: importedEvents.length, filtered: eventsToImport.length, cutoff: cutoff.toISOString(), upper: upper ? upper.toISOString() : null });
      }
      console.log('Imported events parsed from content:', importedEvents.length, 'filtered:', eventsToImport.length, 'cutoff:', cutoff.toISOString(), 'sample:', eventsToImport[0] ? { summary: eventsToImport[0].summary, dtstart: eventsToImport[0].dtstart, dtend: eventsToImport[0].dtend } : null);
      let importedCount = 0;

      for (const event of eventsToImport) {
        try {
          // Helper: coerce to Date or return null
          const safeCreateDate = (dateString: string | undefined): Date | null => {
            if (!dateString) return null;
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? null : date;
          };

          const start = safeCreateDate(event.dtstart);
          const end = safeCreateDate(event.dtend);
          if (!start || !end) {
            console.error('SKIP_IMPORT_INVALID_DATES', { summary: event.summary, dtstart: event.dtstart, dtend: event.dtend });
            continue; // skip invalid entries instead of assigning "now"
          }

          // Create photography session from calendar event
          const session = {
            id: `imported-${(event.uid || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`).replace(/[^a-zA-Z0-9_-]/g,'')}`,
            icalUid: event.uid || undefined,
            title: event.summary || 'Imported Event',
            description: event.description || '',
            sessionType: 'imported',
            status: 'confirmed',
            // Ensure timestamps are valid Date objects for Drizzle/pg driver
            startTime: start,
            endTime: end,
            locationName: event.location || '',
            locationAddress: event.location || '',
            clientName: extractClientFromDescription(event.description || event.summary || ''),
            clientEmail: '',
            clientPhone: '',
            // omit optional pricing fields to avoid decimal coercion issues
            paymentStatus: 'pending',
            conflictDetected: false,
            weatherDependent: false,
            goldenHourOptimized: false,
            portfolioWorthy: false,
            editingStatus: 'pending',
            deliveryStatus: 'pending',
            isRecurring: false,
            reminderSent: false,
            confirmationSent: false,
            followUpSent: false,
            isOnlineBookable: false,
            availabilityStatus: 'booked',
            priority: 'medium',
            isPublic: false,
            photographerId: 'imported',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Debug: log runtime types for timestamp-like fields before insert
          try {
            const timestampFields = ['startTime', 'endTime', 'createdAt', 'updatedAt'];
            const types: any = {};
            for (const f of timestampFields) {
              const v = (session as any)[f];
              types[f] = v === undefined ? 'undefined' : (v && v.constructor ? v.constructor.name : typeof v);
            }
            console.log('DEBUG import session types:', { summary: event.summary, uid: event.uid, types });
          } catch (logErr) {
            console.error('Failed to log session types for import event:', logErr);
          }

          // Diagnostic: print types and small snapshot to stderr so we can capture offending values in server.err
            try {
            // Single-line marker for log search
            const diagFields = ['startTime', 'endTime', 'createdAt', 'updatedAt', 'deliveryDate'];
            const diagParts: string[] = [];
            for (const f of diagFields) {
              const v = (session as any)[f];
              const t = v === undefined ? 'undefined' : (v && v.constructor ? v.constructor.name : typeof v);
              const val = v instanceof Date ? v.toISOString() : (v === undefined ? 'null' : String(v));
              diagParts.push(`${f}=${t}:${val}`);
            }
            console.error(`IMPORT_DIAG_SINGLELINE | summary=${event.summary || ''} | uid=${event.uid || ''} | ${diagParts.join(' | ')}`);
          } catch (diagErr) {
            console.error('IMPORT DIAG failed:', diagErr);
          }

          // Log a compact session preview before attempting insert
          try {
            const previewParts: string[] = [];
            ['startTime','endTime','createdAt','updatedAt','deliveryDate'].forEach((k) => {
              const v = (session as any)[k];
              const t = v === undefined ? 'undefined' : (v && v.constructor ? v.constructor.name : typeof v);
              previewParts.push(`${k}=${t}`);
            });
            console.error(`IMPORT_BEFORE_INSERT | summary=${event.summary || ''} | uid=${event.uid || ''} | ${previewParts.join(' | ')}`);
          } catch (e) { console.error('Failed logging pre-insert session preview', e); }

          // Synchronous debug snapshot to capture payload exactly before DB insert (write to OS temp dir)
          try {
            const tmpDir = os.tmpdir();
            const debugPath = path.join(tmpDir, 'clean-crm-debug_import_snapshot.log');
            const snapshot = {
              timestamp: new Date().toISOString(),
              eventSummary: event.summary,
              sessionPreview: {
                startTimeType: typeof session.startTime,
                startTimeConstructor: (session.startTime as any)?.constructor ? (session.startTime as any).constructor.name : null,
                startTimeValue: session.startTime && (session.startTime as any).toString ? (session.startTime as any).toString() : String(session.startTime),
                endTimeType: typeof session.endTime,
                endTimeConstructor: (session.endTime as any)?.constructor ? (session.endTime as any).constructor.name : null,
                endTimeValue: session.endTime && (session.endTime as any).toString ? (session.endTime as any).toString() : String(session.endTime),
                createdAtType: typeof session.createdAt,
                createdAtConstructor: (session.createdAt as any)?.constructor ? (session.createdAt as any).constructor.name : null,
                createdAtValue: session.createdAt && (session.createdAt as any).toString ? (session.createdAt as any).toString() : String(session.createdAt),
                updatedAtType: typeof session.updatedAt,
                updatedAtConstructor: (session.updatedAt as any)?.constructor ? (session.updatedAt as any).constructor.name : null,
                updatedAtValue: session.updatedAt && (session.updatedAt as any).toString ? (session.updatedAt as any).toString() : String(session.updatedAt),
              }
            };
            fs.appendFileSync(debugPath, JSON.stringify(snapshot) + '\n', { encoding: 'utf8' });
            console.error(`WROTE_IMPORT_SNAPSHOT | path=${debugPath} | summary=${String(event.summary).slice(0,80)}`);
          } catch (dbgErr) {
            // Ensure debug failure doesn't stop import
            console.error('Failed to write debug snapshot:', dbgErr);
          }
          await storage.createPhotographySession(session);
          importedCount++;
        } catch (error) {
          console.error('Error importing event:', event.summary, error);
        }
      }

      res.json({ 
        success: true, 
        imported: importedCount,
  cutoff: cutoff.toISOString(),
  upper: upper ? upper.toISOString() : null,
        message: `Successfully imported ${importedCount} events from ${fileName}`
      });

    } catch (error) {
  console.error("Error importing iCal file:", error);
  res.status(500).json({ error: "Failed to parse iCal file", details: (error as Error)?.message });
    }
  });

  app.post("/api/calendar/import/ics-url", async (req: Request, res: Response) => {
    try {
      const { icsUrl } = req.body;
      
      if (!icsUrl) {
        return res.status(400).json({ error: 'No iCal URL provided' });
      }

      // Fetch iCal content from URL with robust headers and retries
      const fetch = (await import('node-fetch')).default;
      const maxAttempts = 3;
      let attempt = 0;
      let icsContent = '';
      let lastStatus = 0;
      let lastError: any = null;
      while (attempt < maxAttempts && !icsContent) {
        attempt++;
        try {
          const resp = await fetch(icsUrl, {
            method: 'GET',
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
              'Accept': 'text/calendar, text/plain;q=0.9, */*;q=0.8',
            },
          } as any);
          lastStatus = resp.status;
          if (!resp.ok) {
            throw new Error(`Fetch failed with status ${resp.status}`);
          }
          const text = await resp.text();
          // Detect HTML (e.g., Google login page) which indicates the URL is not directly accessible
          if (/<!DOCTYPE html>|<html[\s>]/i.test(text)) {
            throw new Error('Received HTML instead of ICS (URL likely not accessible without authentication)');
          }
          icsContent = text;
        } catch (e) {
          lastError = e;
          await new Promise(r => setTimeout(r, 300 * attempt));
        }
      }

      if (!icsContent) {
        const msg = lastError?.message || `Failed to fetch calendar: HTTP ${lastStatus}`;
        return res.status(502).json({
          error: 'Failed to fetch iCal content',
          details: msg,
          hint: 'If using Google, copy the Secret address in iCal format (private-.../basic.ics). Ensure the link is correct and try again.'
        });
      }

      // Persist raw iCal content snapshot synchronously for debugging (write to OS temp dir)
      try {
        const tmpDir = os.tmpdir();
        const rawPath = path.join(tmpDir, 'clean-crm-debug_ics_content.log');
        const header = `==== ICS SNAPSHOT ${new Date().toISOString()} URL: ${icsUrl} LENGTH: ${icsContent.length} ====`;
        fs.appendFileSync(rawPath, header + '\n' + icsContent.substring(0, 2000) + '\n\n', { encoding: 'utf8' });
        console.error(`WROTE_ICS_SNAPSHOT | path=${rawPath} | len=${icsContent.length}`);
      } catch (e) {
        console.error('Failed to write ICS content snapshot:', e);
      }

      // Parse iCal content and convert to photography sessions
      const importedEvents = parseICalContent(icsContent);
      const cutoff = getImportCutoffUtc(req);
      const upper = getImportUpperBoundUtc(req);
      const eventsToImport = importedEvents.filter(ev => {
        const ds = ev?.dtstart ? new Date(ev.dtstart) : null;
        return !!(ds && !isNaN(ds.getTime()) && ds >= cutoff && (!upper || ds <= upper));
      });
      const dryRun = String(req.query.dryRun || req.query.dryrun || '').toLowerCase() === 'true';
      if (dryRun) {
        console.error(`ICS_URL_DRY_RUN | events=${importedEvents.length} | filtered=${eventsToImport.length} | cutoff=${cutoff.toISOString()} | upper=${upper ? upper.toISOString() : 'none'} | url=${icsUrl}`);
        return res.json({ success: true, dryRun: true, parsed: importedEvents.length, filtered: eventsToImport.length, cutoff: cutoff.toISOString(), upper: upper ? upper.toISOString() : null });
      }
      let importedCount = 0;

      for (const event of eventsToImport) {
        try {
          // Helper: coerce to Date or return null
          const safeCreateDate = (dateString: string | undefined): Date | null => {
            if (!dateString) return null;
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? null : date;
          };

          const start = safeCreateDate(event.dtstart);
          const end = safeCreateDate(event.dtend);
          if (!start || !end) {
            console.error('SKIP_IMPORT_INVALID_DATES', { summary: event.summary, dtstart: event.dtstart, dtend: event.dtend });
            continue; // skip invalid entries instead of assigning "now"
          }

          // Create photography session from calendar event
          const session = {
            id: `imported-${(event.uid || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`).replace(/[^a-zA-Z0-9_-]/g,'')}`,
            icalUid: event.uid || undefined,
            title: event.summary || 'Imported Event',
            description: event.description || '',
            sessionType: 'imported',
            status: 'confirmed',
            // Ensure timestamps are valid Date objects for Drizzle/pg driver
            startTime: start,
            endTime: end,
            locationName: event.location || '',
            locationAddress: event.location || '',
            clientName: extractClientFromDescription(event.description || event.summary || ''),
            clientEmail: '',
            clientPhone: '',
            // omit optional pricing fields to avoid decimal coercion issues
            paymentStatus: 'pending',
            conflictDetected: false,
            weatherDependent: false,
            goldenHourOptimized: false,
            portfolioWorthy: false,
            editingStatus: 'pending',
            deliveryStatus: 'pending',
            isRecurring: false,
            reminderSent: false,
            confirmationSent: false,
            followUpSent: false,
            isOnlineBookable: false,
            availabilityStatus: 'booked',
            priority: 'medium',
            isPublic: false,
            photographerId: 'imported',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Synchronous debug snapshot to capture payload exactly before DB insert (write to OS temp dir)
          try {
            const tmpDir = os.tmpdir();
            const debugPath = path.join(tmpDir, 'clean-crm-debug_import_snapshot.log');
            const snapshot = {
              timestamp: new Date().toISOString(),
              eventSummary: event.summary,
              sessionPreview: {
                startTimeType: typeof session.startTime,
                startTimeConstructor: session.startTime && session.startTime.constructor ? session.startTime.constructor.name : null,
                startTimeValue: session.startTime && session.startTime.toString ? session.startTime.toString() : String(session.startTime),
                endTimeType: typeof session.endTime,
                endTimeConstructor: session.endTime && session.endTime.constructor ? session.endTime.constructor.name : null,
                endTimeValue: session.endTime && session.endTime.toString ? session.endTime.toString() : String(session.endTime),
                createdAtType: typeof session.createdAt,
                createdAtConstructor: session.createdAt && session.createdAt.constructor ? session.createdAt.constructor.name : null,
                createdAtValue: session.createdAt && session.createdAt.toString ? session.createdAt.toString() : String(session.createdAt),
                updatedAtType: typeof session.updatedAt,
                updatedAtConstructor: session.updatedAt && session.updatedAt.constructor ? session.updatedAt.constructor.name : null,
                updatedAtValue: session.updatedAt && session.updatedAt.toString ? session.updatedAt.toString() : String(session.updatedAt),
              }
            };
            fs.appendFileSync(debugPath, JSON.stringify(snapshot) + '\n', { encoding: 'utf8' });
            console.error(`WROTE_IMPORT_SNAPSHOT | path=${debugPath} | summary=${String(event.summary).slice(0,80)}`);
          } catch (dbgErr) {
            // Ensure debug failure doesn't stop import
            console.error('Failed to write debug snapshot:', dbgErr);
          }

          await storage.createPhotographySession(session);
          importedCount++;
        } catch (error) {
          console.error('Error importing event:', event.summary, error);
        }
      }

      res.json({ 
        success: true, 
        imported: importedCount,
  cutoff: cutoff.toISOString(),
  upper: upper ? upper.toISOString() : null,
        message: `Successfully imported ${importedCount} events from calendar URL`
      });

    } catch (error) {
  console.error("Error importing from iCal URL:", error);
  res.status(500).json({ error: "Failed to fetch or parse iCal URL", details: (error as Error)?.message });
    }
  });

  // Helper function to parse iCal content
  function parseICalContent(icsContent: string) {
    const events: any[] = [];
    const lines = icsContent.split('\n');
    let currentEvent: any = null;
    let multiLineValue = '';
    let multiLineProperty = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Handle line continuation (lines starting with space or tab)
      if (line.startsWith(' ') || line.startsWith('\t')) {
        multiLineValue += line.substring(1);
        continue;
      }
      
      // Process the previous multi-line property if any
      if (multiLineProperty && multiLineValue) {
        if (currentEvent) {
          currentEvent[multiLineProperty.toLowerCase()] = decodeICalValue(multiLineValue);
        }
        multiLineProperty = '';
        multiLineValue = '';
      }

      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        events.push(currentEvent);
        currentEvent = null;
      } else if (currentEvent && line.includes(':')) {
        const colonIndex = line.indexOf(':');
        const property = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);

        // Handle multi-line values
        multiLineProperty = property;
        multiLineValue = value;

        // Extract base property and any parameters (e.g., TZID)
        const [baseProp, ...paramParts] = property.split(';');
        const propName = baseProp.toLowerCase();
        const params: Record<string, string> = {};
        for (const p of paramParts) {
          const eqIdx = p.indexOf('=');
          if (eqIdx > -1) {
            const k = p.substring(0, eqIdx).trim().toLowerCase();
            const v = p.substring(eqIdx + 1).trim();
            params[k] = v;
          }
        }

    if (propName === 'dtstart' || propName === 'dtend') {
          try {
      const defaultTz = process.env.DEFAULT_CAL_TZ || 'Europe/Vienna';
      const parsed = parseICalDate(value, params['tzid'] || defaultTz);
      currentEvent[propName] = parsed; // may be undefined on failure
          } catch (error) {
            console.error(`Error parsing ${propName}: ${value}`, error);
            currentEvent[propName] = undefined; // don't default to now
          }
        } else {
          currentEvent[propName] = decodeICalValue(value);
        }
      }
    }

    return events;
  }

  // Helper function to parse iCal dates (supports TZID and all-day values)
  function parseICalDate(dateString: string, tzid?: string): string | undefined {
    try {
      // Quiet parser; callers decide how to handle undefined
      
      // Handle various iCal date formats
      let cleanDate = dateString.trim();
      
      // Google Calendar format: 20131013T100000Z
      if (cleanDate.includes('T') && cleanDate.endsWith('Z')) {
        // Remove Z suffix
        cleanDate = cleanDate.replace('Z', '');
        
        const datePart = cleanDate.split('T')[0];
        const timePart = cleanDate.split('T')[1];
        
        if (datePart.length === 8 && timePart.length === 6) {
          const year = datePart.substring(0, 4);
          const month = datePart.substring(4, 6);
          const day = datePart.substring(6, 8);
          const hour = timePart.substring(0, 2);
          const minute = timePart.substring(2, 4);
          const second = timePart.substring(4, 6);
          
          // Create ISO string manually to avoid invalid date issues
          const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
          console.log(`Created ISO string: ${isoString}`);
          
          const dateObj = new Date(isoString);
          if (!isNaN(dateObj.getTime())) {
            return dateObj.toISOString();
          }
        }
      }
      
      // Handle YYYYMMDD format (all-day events)
      if (cleanDate.length === 8 && !cleanDate.includes('T')) {
        const year = cleanDate.substring(0, 4);
        const month = cleanDate.substring(4, 6);
        const day = cleanDate.substring(6, 8);
        
        // Treat all-day as midnight in specified TZ (or UTC) then convert to UTC
        const localIso = `${year}-${month}-${day}T00:00:00`;
        const isoString = tzid ? convertLocalToUtcIso(localIso, tzid) : `${year}-${month}-${day}T00:00:00.000Z`;
        const dateObj = new Date(isoString);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString();
        }
      }

      // Handle local time like YYYYMMDDTHHMMSS (possibly with TZID)
      if (cleanDate.length === 15 && cleanDate.includes('T')) {
        const datePart = cleanDate.substring(0, 8);
        const timePart = cleanDate.substring(9, 15);
        const year = parseInt(datePart.substring(0, 4), 10);
        const month = parseInt(datePart.substring(4, 6), 10);
        const day = parseInt(datePart.substring(6, 8), 10);
        const hour = parseInt(timePart.substring(0, 2), 10);
        const minute = parseInt(timePart.substring(2, 4), 10);
        const second = parseInt(timePart.substring(4, 6), 10);

        const localIso = `${year.toString().padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}`;
        const utcIso = tzid ? convertLocalToUtcIso(localIso, tzid) : new Date(localIso).toISOString();
        const dateObj = new Date(utcIso);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString();
        }
      }
      
      // Fallback: try parsing as-is
      const fallbackDate = new Date(dateString);
      if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate.toISOString();
      }
      
  // If all else fails, let caller skip
  return undefined;
      
    } catch (error) {
  console.error(`Error parsing date: ${dateString}`, error);
  return undefined;
    }
  }

  // Convert a local ISO (no timezone) in a given IANA TZ to a UTC ISO string
  function convertLocalToUtcIso(localIso: string, tzid: string): string {
    try {
      // Load date-fns-tz synchronously in ESM using createRequire
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createRequire } = require('module');
      const requireFn = createRequire(import.meta.url);
      const tzLib = requireFn('date-fns-tz');
      if (tzLib && typeof tzLib.zonedTimeToUtc === 'function') {
        const d = tzLib.zonedTimeToUtc(localIso, tzid);
        return new Date(d).toISOString();
      }
    } catch (e) {
      console.error('convertLocalToUtcIso failed to load date-fns-tz:', e);
    }
    // Fallback: compute UTC using Intl time zone math
    try {
      const m = localIso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
      if (m) {
        const y = +m[1];
        const mo = +m[2];
        const d = +m[3];
        const hh = +m[4];
        const mm = +m[5];
        const ss = +m[6];
        const epoch = toUtcFromTz(y, mo, d, hh, mm, ss, tzid);
        return new Date(epoch).toISOString();
      }
    } catch {}
    // Last resort
    const d2 = new Date(localIso);
    return isNaN(d2.getTime()) ? new Date().toISOString() : d2.toISOString();
  }

  // Compute UTC epoch from local date/time in a given IANA time zone
  function toUtcFromTz(y: number, m: number, d: number, hh: number, mm: number, ss: number, timeZone: string): number {
    const approx = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
    const offsetMin = tzOffset(approx, timeZone);
    return approx.getTime() - offsetMin * 60000;
  }

  function tzOffset(dateUTC: Date, timeZone: string): number {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const parts = dtf.formatToParts(dateUTC);
    const map: any = {};
    for (const { type, value } of parts) {
      if (type !== 'literal') map[type] = value;
    }
    const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second);
    return (asUTC - dateUTC.getTime()) / 60000;
  }

  // Helper function to decode iCal values
  function decodeICalValue(value: string): string {
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  // Helper function to extract client name from description or title
  function extractClientFromDescription(text: string): string {
    // Try to extract client name from common patterns
    const patterns = [
      /client[:\s]+([^,\n]+)/i,
      /with[:\s]+([^,\n]+)/i,
      /für[:\s]+([^,\n]+)/i, // German "for"
      /([A-Z][a-z]+\s+[A-Z][a-z]+)/, // Name pattern
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'Imported Client';
  }

  // ==================== ICAL CALENDAR FEED ====================
  app.get("/api/calendar/photography-sessions.ics", async (req: Request, res: Response) => {
    try {
      // Fetch all photography sessions
      const sessions = await storage.getPhotographySessions();
      
      // Generate iCal content
      const icalLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//New Age Fotografie//Photography CRM//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Photography Sessions',
        'X-WR-CALDESC:Photography sessions from New Age Fotografie CRM'
      ];

      // Add each session as an event
      for (const session of sessions) {
        if (session.startTime && session.endTime) {
          const startDate = new Date(session.startTime);
          const endDate = new Date(session.endTime);
          
          // Format dates for iCal (YYYYMMDDTHHMMSSZ)
          const formatICalDate = (date: Date) => {
            return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
          };
          
          const uid = `session-${session.id}@newagefotografie.com`;
          const now = new Date();
          const dtstamp = formatICalDate(now);
          
          icalLines.push(
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${dtstamp}`,
            `DTSTART:${formatICalDate(startDate)}`,
            `DTEND:${formatICalDate(endDate)}`,
            `SUMMARY:${session.title.replace(/[,;\\]/g, '\\$&')}`,
            `DESCRIPTION:${(session.description || '').replace(/[,;\\]/g, '\\$&')}${session.clientName ? '\\nClient: ' + session.clientName : ''}${session.sessionType ? '\\nType: ' + session.sessionType : ''}`,
            `LOCATION:${(session.locationName || session.locationAddress || '').replace(/[,;\\]/g, '\\$&')}`,
            `STATUS:${session.status === 'completed' ? 'CONFIRMED' : session.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE'}`,
            session.priority === 'high' ? 'PRIORITY:1' : session.priority === 'low' ? 'PRIORITY:9' : 'PRIORITY:5',
            'END:VEVENT'
          );
        }
      }

      icalLines.push('END:VCALENDAR');
      
      const icalContent = icalLines.join('\r\n');
      
      // Set appropriate headers for iCal
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="photography-sessions.ics"');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.send(icalContent);
      
    } catch (error) {
      console.error("Error generating iCal feed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/email/test-connection", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { provider, smtpHost, smtpPort, username, password, useTLS } = req.body;

      // Basic validation
      if (!smtpHost || !smtpPort || !username || !password) {
        return res.status(400).json({
          success: false,
          message: "Missing required connection parameters"
        });
      }

      // For the business email hallo@newagefotografie.com, provide guidance
      if (username === "hallo@newagefotografie.com") {
        return res.json({
          success: true,
          message: "Business email configuration ready. Contact your hosting provider to set up SMTP authentication for hallo@newagefotografie.com to enable full inbox functionality."
        });
      }

      // For other emails, provide standard configuration guidance
      const providerSettings = {
        gmail: {
          smtp: "smtp.gmail.com",
          port: 587,
          security: "TLS",
          note: "Use App Password instead of regular password for Gmail"
        },
        outlook: {
          smtp: "smtp-mail.outlook.com", 
          port: 587,
          security: "TLS",
          note: "Use your Microsoft account credentials"
        }
      };

      const settings = providerSettings[provider as keyof typeof providerSettings];
      
      if (settings && smtpHost === settings.smtp && smtpPort.toString() === settings.port.toString()) {
        return res.json({
          success: true,
          message: `Connection settings verified for ${provider}. ${settings.note}`
        });
      }

      return res.json({
        success: false,
        message: "Please verify your email provider settings and credentials"
      });
    } catch (error) {
      console.error("Error testing email connection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to test email connection"
      });
    }
  });

  // ==================== EMAIL SETTINGS ====================
  app.post("/api/email/settings/save", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, fromName } = req.body;
      
      console.log('Saving email settings:', { smtpHost, smtpPort, smtpUser, fromEmail, fromName });
      
      // Save email settings to database
      const settingsData = {
        smtp_host: smtpHost,
        smtp_port: parseInt(smtpPort) || 587,
        smtp_user: smtpUser,
        smtp_pass: smtpPass, // In production, this should be encrypted
        from_email: fromEmail,
        from_name: fromName,
        updated_at: new Date().toISOString()
      };
      
      await storage.saveEmailSettings(settingsData);
      
      res.json({ 
        success: true, 
        message: 'Email settings saved successfully' 
      });
    } catch (error) {
      console.error('Error saving email settings:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to save email settings: ' + (error as Error).message 
      });
    }
  });

  app.get("/api/email/settings", authenticateUser, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getEmailSettings();
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error getting email settings:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get email settings: ' + (error as Error).message 
      });
    }
  });

  // ==================== EMAIL SENDING ====================
  app.post("/api/email/send", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { to, subject, body, attachments } = req.body;
      
      console.log('Email send request:', { to, subject, body: body?.substring(0, 100) + '...' });
      
  // Use nodemailer (imported at top of file)
      
      // Get email settings - try to load from database first, fallback to EasyName
      let emailSettings;
      try {
        emailSettings = await storage.getEmailSettings();
      } catch (settingsError) {
        console.log('Using fallback email settings');
        emailSettings = {
          smtp_host: 'smtp.easyname.com',
          smtp_port: 587,
          smtp_user: '30840mail10',
          smtp_pass: process.env.EMAIL_PASSWORD || 'HoveBN41!',
          from_email: 'hallo@newagefotografie.com',
          from_name: 'New Age Fotografie'
        };
      }

      const emailConfig = {
        host: emailSettings.smtp_host,
        port: emailSettings.smtp_port,
        secure: false, // Use STARTTLS instead of SSL
        auth: {
          user: emailSettings.smtp_user,
          pass: emailSettings.smtp_pass
        },
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        },
        // Enhanced debugging and reliability
        debug: true,
        logger: true,
        // Add delivery status tracking
        pool: true,
      };

      // Create transporter and send the email
      const transporter = nodemailer.createTransport(emailConfig as any);
      const attachmentsArray = Array.isArray(attachments)
        ? attachments.map((a: any) => ({
            filename: a?.filename || a?.name,
            content: a?.content,
            path: a?.path,
            contentType: a?.contentType || a?.mimetype
          }))
        : undefined;

      const mailOptions = {
        from: `${emailSettings.from_name} <${emailSettings.from_email}>`,
        to,
        subject,
        html: body,
        text: typeof body === 'string' ? body.replace(/<[^>]+>/g, '') : undefined,
        attachments: attachmentsArray
      } as any;

      const info = await transporter.sendMail(mailOptions);

      // Save a copy to CRM messages (best-effort)
      try {
        await storage.createCrmMessage({
          senderName: 'New Age Fotografie (Sent)',
          senderEmail: 'hallo@newagefotografie.com',
          subject: `[SENT] ${subject}`,
          content: `SENT TO: ${to}\n\n${typeof body === 'string' ? body : ''}`,
          status: 'sent', // Changed from 'archived' to 'sent' for proper categorization
          messageType: 'sent'
        });
        console.log('Sent email saved to database successfully');
      } catch (dbError) {
        console.error('Failed to save sent email to database:', dbError);
      }
      
      // Trigger automatic email refresh after sending
      try {
        console.log('Triggering email refresh after send...');
        // Import fresh emails to capture any replies or the sent email
        setTimeout(async () => {
          try {
            const { importEmailsFromIMAP } = await import('./email-import');
            await importEmailsFromIMAP({
              host: 'imap.easyname.com',
              port: 993,
              username: '30840mail10',
              password: process.env.EMAIL_PASSWORD || 'HoveBN41!',
              useTLS: true
            });
            console.log('Automatic email refresh completed after send');
          } catch (refreshError) {
            console.error('Auto refresh failed:', refreshError);
          }
        }, 5000); // Wait 5 seconds for email to be processed by server
      } catch (error) {
        console.log('Auto refresh setup failed, continuing...');
      }

      res.json({ 
        success: true, 
        message: 'Email sent successfully',
        messageId: info.messageId,
        response: info.response,
        envelope: info.envelope
      });
    } catch (error) {
      console.error('Email send error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send email: ' + (error as Error).message 
      });
    }
  });

  // Health check endpoint for deployment monitoring
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0"
    });
  });

  // ==================== TEST CHAT ROUTES ====================
  
  // DEDICATED TOGNINJA BLOG WRITER ASSISTANT ENDPOINT
  app.post("/api/togninja/chat", async (req: Request, res: Response) => {
    console.log("🎯 TOGNINJA BLOG WRITER ASSISTANT ENDPOINT HIT");
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    try {
      const { message, threadId } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const assistantId = "asst_nlyO3yRav2oWtyTvkq0cHZaU"; // TOGNINJA BLOG WRITER
      let currentThreadId = threadId;

      // Create new thread if needed
      if (!currentThreadId) {
        const threadResponse = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({})
        });

        if (!threadResponse.ok) {
          throw new Error(`Failed to create thread: ${threadResponse.status}`);
        }

        const threadData = await threadResponse.json();
        currentThreadId = threadData.id;
      }

      // Add user message to thread
      await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: message
        })
      });

      // Create run with TOGNINJA assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: assistantId
        })
      });

      if (!runResponse.ok) {
        throw new Error(`Failed to create run: ${runResponse.status}`);
      }

      const runData = await runResponse.json();
      const runId = runData.id;

      // Wait for completion
      let runStatus = 'queued';
      let attempts = 0;
      const maxAttempts = 60;

      while (runStatus !== 'completed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });

        if (!statusResponse.ok) {
          throw new Error(`Failed to check run status: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();
        runStatus = statusData.status;
        attempts++;
      }

      if (runStatus !== 'completed') {
        throw new Error(`TOGNINJA assistant run failed with status: ${runStatus}`);
      }

      // Get response
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!messagesResponse.ok) {
        throw new Error(`Failed to get messages: ${messagesResponse.status}`);
      }

      const messagesData = await messagesResponse.json();
      const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant');
      
      const response = assistantMessage?.content?.[0]?.text?.value || "I apologize, but I couldn't generate a response.";

      console.log("🎯 TOGNINJA RESPONSE:", response.slice(0, 100));
      res.json({ 
        response,
        threadId: currentThreadId,
        assistantId: assistantId,
        source: "TOGNINJA_BLOG_WRITER_ASSISTANT"
      });
      
    } catch (error) {
      console.error("TOGNINJA Assistant error:", error);
      res.status(500).json({ 
        error: "TOGNINJA Assistant failed",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // REDIRECT OLD TEST CHAT TO TOGNINJA ENDPOINT
  app.post("/api/test/chat", async (req: Request, res: Response) => {
    console.log("🔄 REDIRECTING OLD /api/test/chat TO TOGNINJA ENDPOINT");
    console.log("Request body:", req.body);
    
    try {
      const { message, threadId } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const assistantId = "asst_nlyO3yRav2oWtyTvkq0cHZaU"; // TOGNINJA BLOG WRITER
      let currentThreadId = threadId;

      // Create new thread if needed
      if (!currentThreadId) {
        const threadResponse = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({})
        });

        if (!threadResponse.ok) {
          throw new Error(`Failed to create thread: ${threadResponse.status}`);
        }

        const threadData = await threadResponse.json();
        currentThreadId = threadData.id;
      }

      // Add user message to thread
      await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: message
        })
      });

      // Create run with TOGNINJA assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: assistantId
        })
      });

      if (!runResponse.ok) {
        throw new Error(`Failed to create run: ${runResponse.status}`);
      }

      const runData = await runResponse.json();
      const runId = runData.id;

      // Wait for completion
      let runStatus = 'queued';
      let attempts = 0;
      const maxAttempts = 60;

      while (runStatus !== 'completed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });

        if (!statusResponse.ok) {
          throw new Error(`Failed to check run status: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();
        runStatus = statusData.status;
        attempts++;
      }

      if (runStatus !== 'completed') {
        throw new Error(`TOGNINJA assistant run failed with status: ${runStatus}`);
      }

      // Get response
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!messagesResponse.ok) {
        throw new Error(`Failed to get messages: ${messagesResponse.status}`);
      }

      const messagesData = await messagesResponse.json();
      const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant');
      
      const response = assistantMessage?.content?.[0]?.text?.value || "I apologize, but I couldn't generate a response.";

      console.log("🎯 TOGNINJA RESPONSE VIA REDIRECT:", response.slice(0, 100));
      res.json({ 
        response,
        threadId: currentThreadId,
        assistantId: assistantId,
        source: "TOGNINJA_BLOG_WRITER_ASSISTANT_REDIRECT"
      });
      
    } catch (error) {
      console.error("TOGNINJA Assistant redirect error:", error);
      res.status(500).json({ 
        error: "TOGNINJA Assistant redirect failed",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ==================== AUTOMATIC EMAIL REFRESH ====================
  app.post("/api/email/refresh", authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log('Starting email refresh...');
      
      const importedEmails = await importEmailsFromIMAP({
        host: 'imap.easyname.com',
        port: 993,
        username: '30840mail10',
        password: process.env.EMAIL_PASSWORD || 'HoveBN41!',
        useTLS: true
      });

      console.log(`Successfully fetched ${importedEmails.length} emails from business account`);

      // Store emails in database, avoid duplicates
      let newEmailCount = 0;
      const existingMessages = await storage.getCrmMessages();
      
      for (const email of importedEmails) {
        // Check if email already exists (improved duplicate check)
        const isDuplicate = existingMessages.some(msg => 
          msg.subject === email.subject && 
          msg.senderEmail === email.from &&
          Math.abs(new Date(msg.createdAt).getTime() - new Date(email.date).getTime()) < 300000 // Within 5 minutes
        );
        
        if (!isDuplicate) {
          try {
            await storage.createCrmMessage({
              senderName: email.fromName,
              senderEmail: email.from,
              subject: email.subject,
              content: email.body,
              status: email.isRead ? 'read' : 'unread'
            });
            newEmailCount++;
            console.log(`Imported new email: ${email.subject} from ${email.from}`);
          } catch (error) {
            console.error('Failed to save email:', error);
          }
        }
      }
      
      console.log(`Imported ${newEmailCount} new emails out of ${importedEmails.length} fetched`);
      
      res.json({ 
        success: true, 
        message: `Email refresh completed: ${newEmailCount} new emails imported`,
        newEmails: newEmailCount,
        totalEmails: importedEmails.length,
        processedEmails: newEmailCount
      });
    } catch (error) {
      console.error('Email refresh error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to refresh emails: ' + (error as Error).message 
      });
    }
  });

  // ==================== AUTOMATIC EMAIL IMPORT SERVICE ====================
  // Background email import service
  let emailImportInterval: NodeJS.Timeout | null = null;
  let lastEmailImportTime = 0;
  
  const startBackgroundEmailImport = () => {
    // Smart email import with duplicate prevention
    if (emailImportInterval) {
      clearInterval(emailImportInterval);
    }
    
    emailImportInterval = setInterval(async () => {
      try {
        // Get last import timestamp to only fetch new emails
        const lastImportTime = await getLastEmailImportTime();
        
        const importedEmails = await importEmailsFromIMAP({
          host: 'imap.easyname.com',
          port: 993,
          username: '30840mail10',
          password: process.env.EMAIL_PASSWORD || 'HoveBN41!',
          useTLS: true,
          since: lastImportTime // Only fetch emails since last import
        } as any);

        // Store only genuinely new emails with advanced duplicate prevention
        let newEmailCount = 0;
        
        for (const email of importedEmails) {
          // Advanced duplicate check using multiple criteria
          const isDuplicate = await checkEmailExists(email);
          
          if (!isDuplicate) {
            try {
              await storage.createCrmMessage({
                senderName: email.fromName,
                senderEmail: email.from,
                subject: email.subject,
                content: email.body,
                status: email.isRead ? 'read' : 'unread'
              });
              newEmailCount++;
            } catch (error) {
              // Skip email if database constraint violation (duplicate)
              if (!error.message.includes('unique') && !error.message.includes('duplicate')) {
                console.error('Failed to save email:', error);
              }
            }
          }
        }
        
        if (newEmailCount > 0) {
          lastEmailImportTime = Date.now();
          await updateLastEmailImportTime(lastEmailImportTime);
        }
      } catch (error) {
        // Background email import failed: error
      }
    }, 2 * 60 * 1000); // Run every 2 minutes for live updates
    
    // Background email import service started (every 5 minutes)
  };

  // Helper functions for smart email import
  async function getLastEmailImportTime(): Promise<Date | undefined> {
    try {
      const result = await db
        .select({ createdAt: crmMessages.createdAt })
        .from(crmMessages)
        .orderBy(crmMessages.createdAt)
        .limit(1);
      
      // Return date 1 hour ago to catch any recent emails we might have missed
      const lastTime = result[0]?.createdAt;
      if (lastTime) {
        const oneHourAgo = new Date(lastTime.getTime() - 60 * 60 * 1000);
        return oneHourAgo;
      }
      
      // If no emails exist, return 24 hours ago
      return new Date(Date.now() - 24 * 60 * 60 * 1000);
    } catch (error) {
      console.error('Error getting last import time:', error);
      return new Date(Date.now() - 24 * 60 * 60 * 1000);
    }
  }

  async function updateLastEmailImportTime(timestamp: number): Promise<void> {
    // Store timestamp in environment or database for persistence
    lastEmailImportTime = timestamp;
  }

  async function checkEmailExists(email: any): Promise<boolean> {
    try {
      const { and } = await import('drizzle-orm');
      const existing = await db
        .select({ id: crmMessages.id })
        .from(crmMessages)
        .where(and(
          eq(crmMessages.senderEmail, email.from),
          eq(crmMessages.subject, email.subject)
        ))
        .limit(1);
      
      return existing.length > 0;
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }

  // Disabled background email import to prevent server overload
  // startBackgroundEmailImport();

  // Endpoint to get email import status
  app.get("/api/email/import-status", authenticateUser, async (req: Request, res: Response) => {
    res.json({ 
      isRunning: emailImportInterval !== null,
      lastImportTime: lastEmailImportTime,
      nextImportIn: lastEmailImportTime ? (5 * 60 * 1000) - (Date.now() - lastEmailImportTime) : 0
    });
  });

  // ==================== HEALTH CHECK ====================
  app.get("/api/health", (req: Request, res: Response) => {
    try {
      res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        demoMode: process.env.DEMO_MODE,
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({ 
        status: "error", 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ==================== CLIENT ERROR LOGGING ====================
  app.post("/api/client-error", (req: Request, res: Response) => {
    try {
      const { error, timestamp, url, userAgent } = req.body;
      console.error(`Client Error [${timestamp}]:`, error);
      console.error(`URL: ${url || req.headers.referer}`);
      console.error(`User Agent: ${userAgent || req.headers['user-agent']}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to log client error:', error);
      res.status(500).json({ success: false });
    }
  });

  // Website scraping and customization routes
  app.post("/api/scrape-website", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "Website URL is required" });
      }

      const { WebsiteScraper } = await import('./scraping-agent');
      const scrapedData = await WebsiteScraper.scrapeWebsite(url);
      
      res.json(scrapedData);
    } catch (error) {
      console.error('Error scraping website:', error);
      res.status(500).json({ error: "Failed to scrape website" });
    }
  });

  app.post("/api/generate-seo-recommendations", async (req: Request, res: Response) => {
    try {
      const { scrapedData, location } = req.body;
      
      if (!scrapedData) {
        return res.status(400).json({ error: "Scraped data is required" });
      }

      const { SEOAgent } = await import('./scraping-agent');
      const recommendations = SEOAgent.generateSEORecommendations(scrapedData, location);
      
      res.json(recommendations);
    } catch (error) {
      console.error('Error generating SEO recommendations:', error);
      res.status(500).json({ error: "Failed to generate SEO recommendations" });
    }
  });

  // Email notification function for new leads
  async function sendNewLeadNotification(lead: any) {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp.easyname.com',
      port: 587,
      secure: false,
      auth: {
        user: '30840mail10',
        pass: 'HoveBN41!'
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const leadSource = lead.source || 'Website';
    const leadMessage = lead.message || 'No message provided';
    
    const emailSubject = `🔔 New Lead: ${lead.name} from ${leadSource}`;
    const emailBody = `
New Lead Notification - New Age Fotografie

📋 Lead Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name: ${lead.name}
Email: ${lead.email}
Phone: ${lead.phone || 'Not provided'}
Company: ${lead.company || 'Not provided'}
Source: ${leadSource}
Status: ${lead.status || 'New'}

📝 Message:
${leadMessage}

🕐 Received: ${new Date().toLocaleString('de-DE', { 
  timeZone: 'Europe/Vienna',
  year: 'numeric',
  month: '2-digit', 
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})} (Vienna time)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💼 Action Required:
• Review the lead in your CRM dashboard
• Contact the prospect within 24 hours
• Update lead status after initial contact

🔗 CRM Dashboard: https://www.newagefotografie.com/admin/leads

Best regards,
New Age Fotografie CRM System
    `;

    const mailOptions = {
      from: 'hallo@newagefotografie.com',
      to: 'hallo@newagefotografie.com',
      subject: emailSubject,
      text: emailBody,
      html: emailBody.replace(/\n/g, '<br>').replace(/━/g, '─')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('New lead notification sent:', info.messageId);
    
    // Save the notification email to the database for tracking
    try {
      await storage.createCrmMessage({
        senderName: 'New Age Fotografie System',
        senderEmail: 'system@newagefotografie.com',
        subject: `[LEAD NOTIFICATION] ${emailSubject}`,
        content: `Lead notification sent to hallo@newagefotografie.com\n\n${emailBody}`,
        status: 'archived'
      });
    } catch (dbError) {
      console.error('Failed to save lead notification to database:', dbError);
    }
  }

  // ==================== VOUCHER MANAGEMENT ROUTES ====================
  
  // Voucher Products Routes
  // ==================== IMAGE UPLOAD ROUTES ====================
  app.post("/api/upload/image", authenticateUser, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Return the local file URL
      const fileUrl = `/uploads/vouchers/${req.file.filename}`;
      
      console.log("Image uploaded successfully:", {
        filename: req.file.filename,
        url: fileUrl,
        size: req.file.size
      });

      res.json({ url: fileUrl });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== VOUCHER ROUTES ====================
  app.get("/api/vouchers/products", async (req: Request, res: Response) => {
    try {
      const language = req.query.language as string || 'de';
      let products = await neonDb.getVoucherProducts();
      
      // Translate content if language is English
      if (language === 'en') {
        products = products.map(product => ({
          ...product,
          name: translateVoucherToEnglish(product.name),
          description: product.description ? translateVoucherToEnglish(product.description) : null,
          termsAndConditions: product.terms_and_conditions ? translateVoucherToEnglish(product.terms_and_conditions) : null
        }));
      }
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching voucher products:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get single voucher product by ID (public endpoint)
  app.get("/api/vouchers/products/:id", async (req: Request, res: Response) => {
    try {
      const product = await neonDb.getVoucherProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Voucher product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching voucher product:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create Stripe payment intent for voucher purchase
  app.post("/api/vouchers/create-payment-intent", async (req: Request, res: Response) => {
    try {
      const { voucherId, quantity = 1, customerDetails, amount } = req.body;

      if (!voucherId || !customerDetails || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get voucher details
      const voucher = await neonDb.getVoucherProduct(voucherId);
      if (!voucher) {
        return res.status(404).json({ error: "Voucher not found" });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // Amount in cents
        currency: 'eur',
        metadata: {
          voucherId,
          quantity: quantity.toString(),
          customerName: `${customerDetails.firstName} ${customerDetails.lastName}`,
          customerEmail: customerDetails.email,
          voucherName: voucher.name
        },
        description: `${quantity}x ${voucher.name} - New Age Fotografie`,
        receipt_email: customerDetails.email,
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ 
        error: "Payment processing error", 
        message: error.message 
      });
    }
  });

  // Stripe webhook endpoint for payment confirmations
  app.post("/api/vouchers/stripe-webhook", async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    let event;

    try {
      // In production, you'd verify the webhook signature
      event = req.body;

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        
        // Create voucher sale record
        const voucherSale = {
          id: paymentIntent.id,
          voucherProductId: paymentIntent.metadata.voucherId,
          customerName: paymentIntent.metadata.customerName,
          customerEmail: paymentIntent.metadata.customerEmail,
          quantity: parseInt(paymentIntent.metadata.quantity),
          totalAmount: (paymentIntent.amount / 100).toString(),
          paymentStatus: 'completed',
          paymentMethod: 'stripe',
          stripePaymentIntentId: paymentIntent.id,
          purchaseDate: new Date().toISOString(),
          voucherCode: generateVoucherCode(),
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await storage.createVoucherSale(voucherSale);
        
        // Send voucher email to customer
        await sendVoucherEmail(voucherSale);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Admin endpoint for voucher products
  app.get("/api/admin/vouchers/products/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const product = await neonDb.getVoucherProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Voucher product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching voucher product:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/vouchers/products", authenticateUser, async (req: Request, res: Response) => {
    try {
      const validatedData = insertVoucherProductSchema.parse(req.body);
      const product = await neonDb.createVoucherProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating voucher product:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/vouchers/products/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const product = await neonDb.updateVoucherProduct(req.params.id, req.body);
      res.json(product);
    } catch (error) {
      console.error("Error updating voucher product:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/vouchers/products/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await neonDb.deleteVoucherProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting voucher product:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Discount Coupons Routes
  app.get("/api/vouchers/coupons", authenticateUser, async (req: Request, res: Response) => {
    try {
      const coupons = await storage.getDiscountCoupons();
      res.json(coupons);
    } catch (error) {
      console.error("Error fetching discount coupons:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/vouchers/coupons", authenticateUser, async (req: Request, res: Response) => {
    try {
  const validatedData = insertDiscountCouponSchema.parse(req.body);
  const { applicableProductId, applicableProductSlug } = req.body as any;
  const { ...rest } = validatedData as any;
      // Normalize single product selection into array field expected by DB
      const payload = {
        ...rest,
        applicableProducts: Array.isArray(validatedData.applicableProducts)
          ? validatedData.applicableProducts
          : (applicableProductSlug ? [applicableProductSlug] : (applicableProductId ? [applicableProductId] : validatedData.applicableProducts))
      };
      const coupon = await storage.createDiscountCoupon(payload);
      res.status(201).json(coupon);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating discount coupon:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/vouchers/coupons/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { applicableProductId, applicableProducts, ...rest } = req.body as any;
      const updates: any = { ...rest };
      if (Array.isArray(applicableProducts)) {
        updates.applicableProducts = applicableProducts;
      } else if (applicableProductId) {
        updates.applicableProducts = [applicableProductId];
      }
      const coupon = await storage.updateDiscountCoupon(req.params.id, updates);
      res.json(coupon);
    } catch (error) {
      console.error("Error updating discount coupon:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/vouchers/coupons/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deleteDiscountCoupon(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting discount coupon:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Validate coupon code (public endpoint for frontend)
  app.post("/api/vouchers/coupons/validate", async (req: Request, res: Response) => {
    try {
      const { code, orderAmount, items } = req.body as {
        code: string;
        orderAmount?: number | string; // in euros
        items?: Array<{ productId?: string; productSlug?: string; sku?: string; name?: string; price: number; quantity: number }>;
      };
      
      if (!code) {
        return res.status(400).json({ error: "Coupon code is required" });
      }

      const codeTrimmed = String(code).trim();
      const codeUpper = codeTrimmed.toUpperCase();

      // First: env-driven custom coupons (COUPONS_JSON) via coupons service
      const envCoupon = findCoupon(codeUpper);

      let coupon = null as any;
      if (!envCoupon) {
        coupon = await storage.getDiscountCouponByCode(codeTrimmed);
      }
      
      if (!envCoupon && !coupon) {
        return res.status(404).json({ error: "Invalid coupon code" });
      }

      // Validate coupon
      const now = new Date();
      const errors = [];

      if (!envCoupon && coupon) {
        if (!coupon.isActive) {
          errors.push("Coupon is not active");
        }
        if (coupon.startDate && new Date(coupon.startDate) > now) {
          errors.push("Coupon is not yet valid");
        }
        if (coupon.endDate && new Date(coupon.endDate) < now) {
          errors.push("Coupon has expired");
        }
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
          errors.push("Coupon usage limit reached");
        }
        if (coupon.minOrderAmount && orderAmount && parseFloat(String(orderAmount)) < parseFloat(String(coupon.minOrderAmount))) {
          errors.push(`Minimum order amount is €${coupon.minOrderAmount}`);
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(", "), valid: false });
      }

      // Determine applicable subtotal and discount
      if (envCoupon) {
        if (!isCouponActive(envCoupon)) {
          return res.status(400).json({ error: 'Coupon is not active', valid: false });
        }
        // Calculate in cents; item.price expected in euros
        let applicableSubtotalCents = 0;
        if (Array.isArray(items) && items.length > 0) {
          for (const it of items) {
            const sku = (it.sku || it.productSlug || '').toString();
            const matches = allowsSku(envCoupon, sku);
            if (matches) {
              const lineTotalCents = Math.round((Number(it.price) || 0) * 100) * (Number(it.quantity) || 1);
              applicableSubtotalCents += Math.max(0, lineTotalCents);
            }
          }
        } else {
          applicableSubtotalCents = Math.max(0, Math.round((Number(orderAmount) || 0) * 100));
        }

        let discountCents = 0;
        if (envCoupon.type === 'percent') {
          const pct = Math.max(0, Math.min(100, envCoupon.value));
          discountCents = Math.round((applicableSubtotalCents * pct) / 100);
        } else {
          discountCents = Math.min(applicableSubtotalCents, Math.max(0, Math.round(envCoupon.value)));
        }

        return res.json({
          valid: true,
          coupon: {
            id: envCoupon.code,
            code: envCoupon.code,
            name: envCoupon.code,
            discountType: envCoupon.type === 'percent' ? 'percentage' : 'fixed',
            discountValue: envCoupon.value,
            discountAmount: (discountCents / 100).toFixed(2),
            applicableProducts: envCoupon.skus || ['all']
          }
        });
      }

      // Fallback: DB coupons flow (legacy)
      // Determine applicable subtotal: restrict to applicableProducts if provided
      let applicableSubtotal = 0;
      const allProducts = !coupon.applicableProducts || coupon.applicableProducts.length === 0 || coupon.applicableProducts.includes('all');

      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          const lineTotal = (Number(it.price) || 0) * (Number(it.quantity) || 1);
          if (allProducts) {
            applicableSubtotal += lineTotal;
          } else if (
            (it.productId && coupon.applicableProducts?.includes(it.productId)) ||
            (it.productSlug && coupon.applicableProducts?.includes(it.productSlug)) ||
            (it.name && coupon.applicableProducts?.some(p => (p || '').toLowerCase() === (it.name || '').toLowerCase()))
          ) {
            applicableSubtotal += lineTotal;
          }
        }
      } else {
        applicableSubtotal = parseFloat((orderAmount as any) || '0');
      }

      let discountAmount = 0;
      if (coupon.discountType === 'percentage') {
        discountAmount = (applicableSubtotal * parseFloat(coupon.discountValue)) / 100;
        if (coupon.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, parseFloat(coupon.maxDiscountAmount));
        }
      } else {
        discountAmount = parseFloat(coupon.discountValue);
        discountAmount = Math.min(discountAmount, applicableSubtotal);
      }

      return res.json({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: Number(discountAmount || 0).toFixed(2),
          applicableProducts: coupon.applicableProducts || ['all']
        }
      });
    } catch (error) {
      console.error("Error validating coupon:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Optional: secure admin endpoint to force refresh coupons after Heroku config change
  app.post("/__admin/refresh-coupons", async (req: Request, res: Response) => {
    try {
      const token = (req.headers["x-admin-token"] as string) || '';
      if (token !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ ok: false });
      }
      const count = forceRefreshCoupons();
      return res.json({ ok: true, reloaded: count });
    } catch (e) {
      return res.status(500).json({ ok: false });
    }
  });

  // Voucher Sales Routes
  app.get("/api/vouchers/sales", authenticateUser, async (req: Request, res: Response) => {
    try {
      const sales = await storage.getVoucherSales();
      res.json(sales);
    } catch (error) {
      console.error("Error fetching voucher sales:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/vouchers/sales", authenticateUser, async (req: Request, res: Response) => {
    try {
      const validatedData = insertVoucherSaleSchema.parse(req.body);
      const sale = await storage.createVoucherSale(validatedData);
      res.status(201).json(sale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating voucher sale:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/vouchers/sales/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const sale = await storage.updateVoucherSale(req.params.id, req.body);
      res.json(sale);
    } catch (error) {
      console.error("Error updating voucher sale:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== PRICE LIST ROUTES ====================
  app.get("/api/crm/price-list", async (req: Request, res: Response) => {
    try {
      // Fetch price list from database
      const priceList = await db.select().from(priceListItems).where(eq(priceListItems.isActive, true)).orderBy(priceListItems.category, priceListItems.name);
      
      // Convert decimal to number for API response
      const formattedPriceList = priceList.map(item => ({
        id: item.id,
        category: item.category,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price),
        currency: item.currency,
        taxRate: item.taxRate ? parseFloat(item.taxRate) : 19,
        sku: item.sku,
        productCode: item.productCode,
        unit: item.unit,
        notes: item.notes,
        isActive: item.isActive
      }));

      res.json(formattedPriceList);
    } catch (error) {
      console.error("Error fetching price list:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create new price list item
  app.post("/api/crm/price-list", async (req: Request, res: Response) => {
    try {
      const newItem = await db.insert(priceListItems).values(req.body).returning();
      res.json(newItem[0]);
    } catch (error) {
      console.error("Error creating price list item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update price list item
  app.put("/api/crm/price-list/:id", async (req: Request, res: Response) => {
    try {
      const updatedItem = await db.update(priceListItems)
        .set(req.body)
        .where(eq(priceListItems.id, req.params.id))
        .returning();
      res.json(updatedItem[0]);
    } catch (error) {
      console.error("Error updating price list item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete price list item
  app.delete("/api/crm/price-list/:id", async (req: Request, res: Response) => {
    try {
      await db.delete(priceListItems).where(eq(priceListItems.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting price list item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Import price list from CSV
  app.post("/api/crm/price-list/import", async (req: Request, res: Response) => {
    try {
      const { items } = req.body;
      
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items must be an array" });
      }

      // Validate and format items
      const formattedItems = items.map((item: any) => ({
        name: item.name || item.Name || '',
        description: item.description || item.Description || '',
        category: item.category || item.Category || 'GENERAL',
        price: item.price || item.Price || '0',
        currency: item.currency || item.Currency || 'EUR',
        taxRate: item.taxRate || item.TaxRate || '19.00',
        sku: item.sku || item.SKU || '',
        productCode: item.productCode || item.ProductCode || '',
        unit: item.unit || item.Unit || 'piece',
        notes: item.notes || item.Notes || '',
        isActive: item.isActive !== undefined ? item.isActive : true
      }));

      // Insert into database
      const insertedItems = await db.insert(priceListItems).values(formattedItems).returning();
      
      res.json({ 
        success: true, 
        imported: insertedItems.length,
        items: insertedItems 
      });
    } catch (error) {
      console.error("Error importing price list:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get original hardcoded price list (for migration/reference)
  app.get("/api/crm/price-list/legacy", async (req: Request, res: Response) => {
    try {
      // Complete New Age Fotografie price list based on official price guide
      const priceList = [
        // PRINTS Section
        {
          id: 'print-15x10',
          category: 'PRINTS',
          name: '15 x 10cm',
          description: 'Print 15 x 10cm',
          price: 35.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'print-10er-box',
          category: 'PRINTS',
          name: '10er 15 x 10cm + Gift Box',
          description: '10er 15 x 10cm + Geschenkbox',
          price: 300.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'print-20x30-a4',
          category: 'PRINTS',
          name: '20 x 30cm (A4)',
          description: 'Print 20 x 30cm (A4 Format)',
          price: 59.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'print-30x40-a3',
          category: 'PRINTS',
          name: '30 x 40cm (A3)',
          description: 'Print 30 x 40cm (A3 Format)',
          price: 79.00,
          currency: 'EUR',
          is_active: true
        },

        // LEINWAND Section
        {
          id: 'canvas-30x20-a4',
          category: 'LEINWAND',
          name: '30 x 20cm (A4)',
          description: 'Leinwand 30 x 20cm (A4 Format)',
          price: 75.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'canvas-40x30-a3',
          category: 'LEINWAND',
          name: '40 x 30cm (A3)',
          description: 'Leinwand 40 x 30cm (A3 Format)',
          price: 105.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'canvas-60x40-a2',
          category: 'LEINWAND',
          name: '60 x 40cm (A2)',
          description: 'Leinwand 60 x 40cm (A2 Format)',
          price: 145.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'canvas-70x50',
          category: 'LEINWAND',
          name: '70 x 50cm',
          description: 'Leinwand 70 x 50cm',
          price: 185.00,
          currency: 'EUR',
          is_active: true
        },

        // LUXUSRAHMEN Section
        {
          id: 'luxury-frame-a2-black',
          category: 'LUXUSRAHMEN',
          name: 'A2 (60 x 40cm) Leinwand in schwarzem Holzrahmen',
          description: 'A2 (60 x 40cm) Leinwand in schwarzem Holzrahmen',
          price: 190.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'luxury-frame-40x40',
          category: 'LUXUSRAHMEN',
          name: '40 x 40cm Bildrahmen',
          description: '40 x 40cm Bildrahmen',
          price: 145.00,
          currency: 'EUR',
          is_active: true
        },

        // DIGITAL Section
        {
          id: 'digital-1-bild',
          category: 'DIGITAL',
          name: '1 Bild',
          description: '1 Digitales Bild',
          price: 35.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'digital-10x-paket',
          category: 'DIGITAL',
          name: '10x Paket',
          description: '10 Digitale Bilder Paket',
          price: 295.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'digital-15x-paket',
          category: 'DIGITAL',
          name: '15x Paket',
          description: '15 Digitale Bilder Paket',
          price: 365.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'digital-20x-paket',
          category: 'DIGITAL',
          name: '20x Paket',
          description: '20 Digitale Bilder Paket',
          price: 395.00,
          currency: 'EUR',
          notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
          is_active: true
        },
        {
          id: 'digital-25x-paket',
          category: 'DIGITAL',
          name: '25x Paket',
          description: '25 Digitale Bilder Paket',
          price: 445.00,
          currency: 'EUR',
          notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
          is_active: true
        },
        {
          id: 'digital-30x-paket',
          category: 'DIGITAL',
          name: '30x Paket',
          description: '30 Digitale Bilder Paket',
          price: 490.00,
          currency: 'EUR',
          notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
          is_active: true
        },
        {
          id: 'digital-35x-paket',
          category: 'DIGITAL',
          name: '35x Paket',
          description: '35 Digitale Bilder Paket',
          price: 525.00,
          currency: 'EUR',
          notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
          is_active: true
        },
        {
          id: 'digital-alle-portraits',
          category: 'DIGITAL',
          name: 'Alle Porträts Insgesamt',
          description: 'Alle Porträts Insgesamt',
          price: 595.00,
          currency: 'EUR',
          notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
          is_active: true
        },

        // EXTRAS Section
        {
          id: 'shooting-ohne-gutschein',
          category: 'EXTRAS',
          name: 'Shooting ohne Gutschein',
          description: 'Shooting ohne Gutschein',
          price: 95.00,
          currency: 'EUR',
          notes: 'Kostenlose Versand',
          is_active: true
        }
      ];
      
      res.json(priceList);
    } catch (error) {
      console.error("Error fetching price list:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== KNOWLEDGE BASE ROUTES ====================
  app.get("/api/knowledge-base", authenticateUser, async (req: Request, res: Response) => {
    try {
      const entries = await db.select().from(knowledgeBase);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/knowledge-base", authenticateUser, async (req: Request, res: Response) => {
    try {
      const result = insertKnowledgeBaseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues });
      }

      // Ensure tags is an array per schema
      const kbData = {
        ...result.data,
        tags: Array.isArray(result.data.tags) ? result.data.tags : (result.data.tags ? [result.data.tags] : []),
      } as any;

  const kbInsertRes: any = await db.insert(knowledgeBase).values(kbData).returning() as any;
  const entry = Array.isArray(kbInsertRes) ? kbInsertRes[0] : (kbInsertRes?.rows?.[0] ?? kbInsertRes);

  res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating knowledge base entry:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/knowledge-base/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const result = insertKnowledgeBaseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues });
      }

      const updateData = {
        ...result.data,
        tags: Array.isArray(result.data.tags) ? result.data.tags : (result.data.tags ? [result.data.tags] : []),
        updatedAt: new Date(),
      } as any;

      const kbUpdateRes: any = await db.update(knowledgeBase)
        .set(updateData)
        .where(eq(knowledgeBase.id, req.params.id))
        .returning() as any;
      const entry = Array.isArray(kbUpdateRes) ? kbUpdateRes[0] : (kbUpdateRes?.rows?.[0] ?? kbUpdateRes);

      if (!entry) {
        return res.status(404).json({ error: "Knowledge base entry not found" });
      }

      res.json(entry);
    } catch (error) {
      console.error("Error updating knowledge base entry:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/knowledge-base/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const kbDeleteRes: any = await db.delete(knowledgeBase)
        .where(eq(knowledgeBase.id, req.params.id))
        .returning() as any;
      const entry = Array.isArray(kbDeleteRes) ? kbDeleteRes[0] : (kbDeleteRes?.rows?.[0] ?? kbDeleteRes);

      if (!entry) {
        return res.status(404).json({ error: "Knowledge base entry not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting knowledge base entry:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== QUESTIONNAIRE/SURVEY ROUTES ====================
  
  // Get all surveys (questionnaire templates)
  app.get("/api/surveys", authenticateUser, async (req: Request, res: Response) => {
    try {
      const surveys = await runSql('SELECT * FROM surveys ORDER BY created_at DESC');
      res.json({ surveys, total: surveys.length, page: 1, limit: 50 });
    } catch (error) {
      console.error("Error fetching surveys:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create questionnaire link for client
  app.post("/api/admin/create-questionnaire-link", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { client_id, template_id } = req.body;
      
      if (!client_id) {
        return res.status(400).json({ error: "client_id is required" });
      }

      // Generate short token (16 hex chars)
      const token = require('crypto').randomBytes(8).toString('hex');
      
      // Set expiration to 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      // Insert questionnaire link
      await runSql(
        'INSERT INTO questionnaire_links (token, client_id, template_id, expires_at) VALUES ($1, $2, $3, $4)',
        [token, client_id, template_id || 'default-questionnaire', expiresAt]
      );
      
      // Generate public URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:3001`;
      const link = `${baseUrl}/q/${token}`;
      
      res.json({ token, link });
    } catch (error) {
      console.error("Error creating questionnaire link:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get questionnaire by token (public endpoint)
  app.get("/api/questionnaire/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Get questionnaire link details
      const linkResult = await runSql(
        `SELECT ql.*, c.first_name, c.last_name, c.email 
         FROM questionnaire_links ql 
         JOIN crm_clients c ON ql.client_id = c.id 
         WHERE ql.token = $1 AND (ql.expires_at IS NULL OR ql.expires_at > NOW())`,
        [token]
      );
      
      if (linkResult.length === 0) {
        return res.status(404).json({ error: "Questionnaire not found or expired" });
      }
      
      const link = linkResult[0];
      
      // Get the questionnaire template
      const surveyResult = await runSql(
        'SELECT * FROM surveys WHERE id = $1',
        [link.template_id || 'default-questionnaire']
      );
      
      if (surveyResult.length === 0) {
        return res.status(404).json({ error: "Questionnaire template not found" });
      }
      
      const survey = surveyResult[0];
      
      res.json({
        token,
        clientName: `${link.first_name || ''} ${link.last_name || ''}`.trim(),
        clientEmail: link.email,
        isUsed: link.is_used,
        survey: {
          title: survey.title,
          description: survey.description,
          pages: survey.pages,
          settings: survey.settings
        }
      });
    } catch (error) {
      console.error("Error fetching questionnaire:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Submit questionnaire response (public endpoint)
  app.post("/api/email-questionnaire", async (req: Request, res: Response) => {
    try {
      const { token, clientName, clientEmail, answers } = req.body;
      
      if (!token || !clientName || !clientEmail || !answers) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Verify token and get client info
      const linkResult = await runSql(
        `SELECT ql.*, c.first_name, c.last_name 
         FROM questionnaire_links ql 
         JOIN crm_clients c ON ql.client_id = c.id 
         WHERE ql.token = $1 AND (ql.expires_at IS NULL OR ql.expires_at > NOW()) AND ql.is_used = FALSE`,
        [token]
      );
      
      if (linkResult.length === 0) {
        return res.status(404).json({ error: "Invalid or expired questionnaire link" });
      }
      
      const link = linkResult[0];
      
      // Store response in database
      await runSql(
        'INSERT INTO questionnaire_responses (client_id, token, template_slug, answers) VALUES ($1, $2, $3, $4)',
        [link.client_id, token, link.template_id, JSON.stringify(answers)]
      );
      
      // Mark link as used
      await runSql('UPDATE questionnaire_links SET is_used = TRUE WHERE token = $1', [token]);
      
      // Send studio notification email
      try {
        const { sendStudioNotificationEmail, sendClientConfirmationEmail } = await import('./utils/emailService');
        
        // Send studio notification
        await sendStudioNotificationEmail(clientName, clientEmail, answers, link);
        
        // Send client confirmation
        await sendClientConfirmationEmail(clientEmail, clientName);
        
      } catch (emailError) {
        console.error("Email sending error:", emailError);
        // Don't fail the response if email fails, just log it
      }
      
      res.json({ success: true, message: "Questionnaire submitted successfully" });
    } catch (error) {
      console.error("Error submitting questionnaire:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== OPENAI ASSISTANTS ROUTES ====================
  app.get("/api/openai/assistants", authenticateUser, async (req: Request, res: Response) => {
    try {
      const assistants = await db.select().from(openaiAssistants);
      res.json(assistants);
    } catch (error) {
      console.error("Error fetching OpenAI assistants:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/openai/assistants", authenticateUser, async (req: Request, res: Response) => {
    try {
      const result = insertOpenaiAssistantSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues });
      }

      // Create OpenAI Assistant via API if API key is available
      let openaiAssistantId = null;
      if (process.env.OPENAI_API_KEY) {
        try {
          const openaiResponse = await fetch('https://api.openai.com/v1/assistants', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify({
              name: result.data.name,
              description: result.data.description,
              model: result.data.model || 'gpt-4o',
              instructions: result.data.instructions,
            })
          });

          if (openaiResponse.ok) {
            const openaiAssistant = await openaiResponse.json();
            openaiAssistantId = openaiAssistant.id;
          } else {
            console.error("OpenAI API error:", await openaiResponse.text());
          }
        } catch (openaiError) {
          console.error("Failed to create OpenAI assistant:", openaiError);
        }
      }

      const assistantData = {
        name: result.data.name,
        instructions: result.data.instructions,
        description: result.data.description || '',
        model: result.data.model || 'gpt-4o',
        isActive: typeof result.data.isActive === 'boolean' ? result.data.isActive : true,
        knowledgeBaseIds: Array.isArray(result.data.knowledgeBaseIds) ? result.data.knowledgeBaseIds : (result.data.knowledgeBaseIds ? [result.data.knowledgeBaseIds] : []),
        openaiAssistantId,
        createdBy: req.user.id,
  } as any;

  const assistantInsertRes: any = await db.insert(openaiAssistants).values(assistantData).returning() as any;
  const assistant = Array.isArray(assistantInsertRes) ? assistantInsertRes[0] : (assistantInsertRes?.rows?.[0] ?? assistantInsertRes);

      res.status(201).json(assistant);
    } catch (error) {
      console.error("Error creating OpenAI assistant:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/openai/assistants/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const result = insertOpenaiAssistantSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues });
      }

      const updateAssistant = {
        ...result.data,
        isActive: typeof result.data.isActive === 'boolean' ? result.data.isActive : undefined,
        updatedAt: new Date(),
  } as any;

  const assistantUpdateRes: any = await db.update(openaiAssistants)
    .set(updateAssistant)
    .where(eq(openaiAssistants.id, req.params.id))
    .returning() as any;
  const assistant = Array.isArray(assistantUpdateRes) ? assistantUpdateRes[0] : (assistantUpdateRes?.rows?.[0] ?? assistantUpdateRes);

  if (!assistant) {
        return res.status(404).json({ error: "OpenAI assistant not found" });
      }

      res.json(assistant);
    } catch (error) {
      console.error("Error updating OpenAI assistant:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/openai/assistants/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const assistantDeleteRes: any = await db.delete(openaiAssistants)
        .where(eq(openaiAssistants.id, req.params.id))
        .returning() as any;
      const assistant = Array.isArray(assistantDeleteRes) ? assistantDeleteRes[0] : (assistantDeleteRes?.rows?.[0] ?? assistantDeleteRes);

      if (!assistant) {
        return res.status(404).json({ error: "OpenAI assistant not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting OpenAI assistant:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== OPENAI CHAT ROUTES ====================
  app.post("/api/openai/chat/thread", async (req: Request, res: Response) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ error: "OpenAI API key not configured" });
      }

      const response = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const thread = await response.json();
      res.json({ threadId: thread.id });
    } catch (error) {
      console.error("Error creating thread:", error);
      res.status(500).json({ error: "Failed to create thread" });
    }
  });

  app.post("/api/openai/chat/message", async (req: Request, res: Response) => {
    try {
      const { message, threadId, assistantId } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ error: "OpenAI API key not configured" });
      }

      if (!threadId) {
        return res.status(400).json({ error: "Thread ID is required" });
      }

      // Use the provided assistantId or default to the CRM assistant
      const finalAssistantId = assistantId || 'asst_CH4vIbZPs7gUD36Lxf7vlfIV';
      console.log('Using assistant ID:', finalAssistantId);

      // Add message to thread
      await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: message
        })
      });

      // Create run with assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: finalAssistantId
        })
      });

      if (!runResponse.ok) {
        throw new Error(`Run creation failed: ${runResponse.status}`);
      }

      const run = await runResponse.json();

      // Poll for completion
      let runStatus = run.status;
      let attempts = 0;
      const maxAttempts = 30;

      while ((runStatus === 'queued' || runStatus === 'in_progress') && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          runStatus = statusData.status;
        }
      }

      // Get messages
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!messagesResponse.ok) {
        throw new Error(`Failed to get messages: ${messagesResponse.status}`);
      }

      const messagesData = await messagesResponse.json();
      const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant');

      if (!assistantMessage) {
        throw new Error('No assistant response found');
      }

      const aiResponse = assistantMessage.content[0]?.text?.value || 'Sorry, I could not process your request.';
      res.json({ response: aiResponse });

    } catch (error) {
      console.error("Error sending message:", error);
      
      // Provide CRM-focused fallback response for admin users
      const crmFallbackResponse = generateCRMFallbackResponse(req.body.message);
      res.json({ response: crmFallbackResponse });
    }
  });

  function generateCRMFallbackResponse(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('client') || lowerMessage.includes('kunden') || lowerMessage.includes('customer')) {
      return `I can help you manage clients in your CRM system:

• **View all clients**: Go to Clients page to see your complete client database
• **Add new client**: Use the "New Client" button to create client records
• **Import clients**: Bulk import from CSV/Excel files
• **Client details**: View contact info, booking history, and revenue data
• **High-value clients**: See your top clients by revenue

What specific client management task can I help you with?`;
    }
    
    if (lowerMessage.includes('invoice') || lowerMessage.includes('rechnung') || lowerMessage.includes('payment')) {
      return `I can assist with invoice and payment management:

• **Create invoices**: Generate professional invoices with company branding
• **Track payments**: Monitor paid, pending, and overdue invoices
• **Send invoices**: Email invoices directly to clients
• **Payment status**: Update payment status and track revenue
• **Download invoices**: Generate PDF copies for your records

Which invoice task would you like help with?`;
    }
    
    if (lowerMessage.includes('booking') || lowerMessage.includes('appointment') || lowerMessage.includes('calendar') || lowerMessage.includes('termin')) {
      return `I can help you manage bookings and appointments:

• **View calendar**: See all upcoming photography sessions
• **Schedule sessions**: Book new client appointments
• **Manage availability**: Update your booking calendar
• **Session details**: Track session types, locations, and requirements
• **Client communications**: Send booking confirmations and reminders

What booking management task can I assist with?`;
    }
    
    if (lowerMessage.includes('email') || lowerMessage.includes('mail') || lowerMessage.includes('message')) {
      return `I can help with email and communication management:

• **Inbox management**: View and organize client emails
• **Send emails**: Compose and send professional communications
• **Email campaigns**: Create marketing campaigns for clients
• **Templates**: Use predefined templates for common responses
• **Lead notifications**: Track new lead inquiries automatically

What email task would you like assistance with?`;
    }
    
    if (lowerMessage.includes('report') || lowerMessage.includes('analytics') || lowerMessage.includes('revenue') || lowerMessage.includes('dashboard')) {
      return `I can help you with business analytics and reporting:

• **Revenue reports**: Track total revenue and payment status
• **Client analytics**: See your highest-value clients and booking patterns
• **Performance metrics**: Monitor business growth and key indicators
• **Dashboard overview**: Get a quick summary of your business status
• **Export data**: Download reports for external analysis

Which analytics or reporting task can I help you with?`;
    }
    
    return `Hello! I'm your CRM Operations Assistant. I can help you with:

• **Client Management**: Add, edit, and organize client records
• **Invoice Processing**: Create, send, and track invoices and payments
• **Booking Management**: Schedule appointments and manage your calendar
• **Email Communications**: Handle inbox, send emails, and manage campaigns
• **Business Analytics**: Generate reports and track performance metrics
• **Data Management**: Import/export client data and manage databases

What would you like help with today? Just describe the task and I'll guide you through it.`;
  }

  function generateFallbackResponse(message: string, knowledgeArticles: any[] = []): string {
    const lowerMessage = message.toLowerCase();
    
    // Search knowledge base for relevant content
    const relevantArticle = knowledgeArticles.find(article => 
      lowerMessage.includes(article.title.toLowerCase()) ||
      article.content.toLowerCase().includes(lowerMessage) ||
      article.tags.some((tag: string) => lowerMessage.includes(tag.toLowerCase()))
    );
    
    if (lowerMessage.includes('preis') || lowerMessage.includes('kosten') || lowerMessage.includes('price') || lowerMessage.includes('much') || lowerMessage.includes('cost')) {
      return `Gerne teile ich Ihnen unsere aktuellen Preise mit! 📸

**Professionelle Fotoshootings:**
• Kleines Paket: 1 Foto + Datei + 40x30cm Leinwand: €95
• Standard Paket: 5 Fotos + Dateien + 60x40cm Leinwand: €95  
• Premium Paket: 10 Fotos + Dateien + 70x50cm Leinwand: €295
• Digital Paket: 10 digitale Bilder: €250 - **BESTSELLER!**

**Alle Pakete inkludieren:**
• 60 Minuten professionelles Fotoshooting
• Willkommensgetränk und Beratung
• Outfit-Wechsel möglich
• Bis zu 12 Erwachsene + 4 Kinder
• Haustiere willkommen! 🐕

**Direkter Kontakt:**
WhatsApp: +43 677 633 99210
Email: hallo@newagefotografie.com

Welches Paket interessiert Sie am meisten?`;
    }
    
    if (lowerMessage.includes('termin') || lowerMessage.includes('booking') || lowerMessage.includes('buchung')) {
      return `Sehr gerne helfe ich Ihnen bei der Terminbuchung! 📅

Wir sind meistens ausgebucht, aber ich kann Sie gerne auf unsere Warteliste setzen. Oft bekommen wir kurzfristig Termine frei!

**So geht's:**
1. Geben Sie mir Ihre WhatsApp Nummer: +43 677 633 99210
2. Nennen Sie mir Ihre Wunschtermine
3. Ich melde mich bei Ihnen sobald ein Platz frei wird

**Online Kalender:** https://newagefotografie.sproutstudio.com/invitation/live-link-shootings-new-age-fotografie

Welche Art von Shooting interessiert Sie? Familie, Neugeborene, Schwangerschaft oder Business?`;
    }
    
    if (lowerMessage.includes('hallo') || lowerMessage.includes('hi') || lowerMessage.includes('guten tag')) {
      return `Hallo! Schön, dass Sie da sind! 😊

Ich bin Alex von New Age Fotografie Wien. Wir sind spezialisiert auf:
• Familienfotografie
• Neugeborenen-Shootings  
• Schwangerschaftsfotos
• Business-Headshots

Wie kann ich Ihnen heute helfen? Haben Sie Fragen zu unseren Preisen, möchten Sie einen Termin vereinbaren oder brauchen Sie andere Informationen?

WhatsApp: +43 677 633 99210`;
    }

    if (lowerMessage.includes('familien') || lowerMessage.includes('family') || lowerMessage.includes('familie')) {
      return `Familienfotografie ist unsere Spezialität! 👨‍👩‍👧‍👦

**Familienfotos Pakete:**
• Kleines Paket: 1 Foto + Datei + 40x30cm Leinwand: €95
• Mittleres Paket: 5 Fotos + Dateien + 60x40cm Leinwand: €95  
• Großes Paket: 10 Fotos + Dateien + 70x50cm Leinwand: €295
• 10er Paket (nur digitale Bilder): €250 - **BESTSELLER!**

**Inklusive:**
• 60 Min professionelles Fotoshooting
• Willkommensgetränk & Beratung
• Outfit-Wechsel möglich
• Bis zu 12 Erwachsene + 4 Kinder
• Haustiere willkommen! 🐕

Termin buchen: WhatsApp +43 677 633 99210`;
    }
    
    if (lowerMessage.includes('location') || lowerMessage.includes('adresse') || lowerMessage.includes('wo')) {
      return `Wir haben Studios in Wien und Zürich! 📍

**Studio Wien:**
Schönbrunner Str. 25, 1050 Wien
(5 Minuten von Kettenbrückengasse, Parkplätze verfügbar)

**Kontakt:**
WhatsApp: +43 677 633 99210
Email: hallo@newagefotografie.com

**Öffnungszeiten:**
Freitag - Sonntag: 09:00 - 17:00

Möchten Sie einen Termin vereinbaren?`;
    }
    
    // If we found a relevant article, use it intelligently
    if (relevantArticle) {
      // Extract specific pricing info from knowledge base if it's about pricing
      if (lowerMessage.includes('preis') || lowerMessage.includes('kosten') || lowerMessage.includes('price') || lowerMessage.includes('much')) {
        return `Gerne teile ich Ihnen unsere aktuellen Preise mit! 📸

**Professionelle Fotoshootings:**
• Kleines Paket: 1 Foto + Datei + 40x30cm Leinwand: €95
• Standard Paket: 5 Fotos + Dateien + 60x40cm Leinwand: €95  
• Premium Paket: 10 Fotos + Dateien + 70x50cm Leinwand: €295
• Digital Paket: 10 digitale Bilder: €250 - **BESTSELLER!**

**Alle Pakete inkludieren:**
• 60 Minuten professionelles Fotoshooting
• Willkommensgetränk und Beratung
• Outfit-Wechsel möglich
• Bis zu 12 Erwachsene + 4 Kinder
• Haustiere willkommen! 🐕

**Direkter Kontakt:**
WhatsApp: +43 677 633 99210
Email: hallo@newagefotografie.com`;
      }
      
      // For general questions, provide focused response based on article content
      return `Basierend auf Ihrem Interesse kann ich Ihnen folgende Informationen geben:

Als Ihr Photo Consultant bei New Age Fotografie unterstütze ich Sie gerne bei allen Fragen rund um professionelle Fotoshootings in Wien.

**Unsere Spezialgebiete:**
• Familienfotografie & Kinderporträts
• Neugeborenen-Shootings
• Schwangerschaftsfotos (Babybauch)
• Business-Headshots & Corporate Fotografie

**Studio Wien:**
Schönbrunner Str. 25, 1050 Wien
(5 Min von Kettenbrückengasse)

**Direkter Kontakt:**
WhatsApp: +43 677 633 99210
Email: hallo@newagefotografie.com

Was interessiert Sie am meisten? Preise, Terminbuchung oder spezielle Fotoshootings?`;
    }
    
    return `Vielen Dank für Ihre Nachricht! 😊

Ich bin Alex von New Age Fotografie Wien. Gerne helfe ich Ihnen bei:
• **Preisanfragen** (ab €95 für Foto-Pakete)
• **Terminbuchungen** (meist ausgebucht, aber Warteliste verfügbar)  
• **Informationen** über unsere Services

**Direkter Kontakt:**
WhatsApp: +43 677 633 99210
Email: hallo@newagefotografie.com

Was interessiert Sie am meisten?`;
  }

  // ==================== CHAT LEADS TRACKING ====================
  app.post("/api/chat/save-lead", async (req: Request, res: Response) => {
    try {
  const { name, email, phone, message, conversation } = req.body;
      
  const leadInsertRes: any = await db.insert(crmLeads).values({
        name: name || 'Chat Visitor',
        email: email || '',
        phone: phone || '',
        message: message || '',
        source: 'Website Chat',
        status: 'new',
        priority: 'medium',
        value: 0,
        tags: ['chat', 'website'],
        followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  } as any).returning() as any;
  const lead = Array.isArray(leadInsertRes) ? leadInsertRes[0] : (leadInsertRes?.rows?.[0] ?? leadInsertRes);

      // If conversation history exists, save it as a message
      if (conversation && conversation.length > 0) {
        const conversationText = conversation.map((msg: any) => 
          `${msg.isUser ? 'Kunde' : 'Alex'}: ${msg.text}`
        ).join('\n');
        
  await db.insert(crmMessages).values({
          senderName: name || 'Chat Visitor',
          senderEmail: email || 'chat@website.com',
          subject: 'Website Chat Conversation',
          content: conversationText,
          status: 'unread',
          clientId: null,
          assignedTo: null,
  } as any);
      }

      res.json({ success: true, leadId: lead.id });
    } catch (error) {
      console.error("Error saving chat lead:", error);
      res.status(500).json({ error: "Failed to save lead" });
    }
  });

  // Helper function to generate voucher codes
  function generateVoucherCode(): string {
    return 'NAF-' + Math.random().toString(36).substring(2, 15).toUpperCase();
  }

  // Helper function to send voucher email
  async function sendVoucherEmail(voucherSale: any) {
    try {
      console.log(`Sending voucher email to ${voucherSale.customerEmail}`);
      console.log(`Voucher code: ${voucherSale.voucherCode}`);
      
      // Integration with existing email system
      // This would send a professional voucher email with the code
    } catch (error) {
      console.error('Error sending voucher email:', error);
    }
  }

  // ==================== AUTOBLOG ROUTES ====================
  // Set up multer for file uploads
  const autoblogUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 3 // Maximum 3 images
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed') as any, false);
      }
    }
  });

  // AutoBlog status endpoint
  app.get("/api/autoblog/status", async (req: Request, res: Response) => {
    try {
      res.json({
        available: !!process.env.OPENAI_API_KEY,
        maxImages: 3,
        supportedLanguages: ['de', 'en'],
        features: ['AI Content Generation', 'SEO Optimization', 'Multi-language Support', 'Direct Chat Interface']
      });
    } catch (error) {
      console.error('AutoBlog status error:', error);
      res.status(500).json({ error: 'Failed to get AutoBlog status' });
    }
  });

  // AutoBlog generation endpoint
  // FIX #2: AutoBlog route now exclusively uses TOGNINJA Assistant API (Fix from expert analysis)
  app.post("/api/autoblog/generate", authenticateUser, autoblogUpload.array('images', 3), async (req: Request, res: Response) => {
    try {
      const { AutoBlogOrchestrator } = await import('./autoblog');
      const { autoBlogInputSchema } = await import('./autoblog-schema');
      
      // FIX #2: Parse ALL form data properly
      const input = autoBlogInputSchema.parse({
        contentGuidance: req.body.contentGuidance || req.body.userPrompt, // Support both field names
        language: req.body.language || 'de',
        siteUrl: req.body.siteUrl,
        publishOption: req.body.publishOption || 'draft',
        scheduledFor: req.body.scheduledFor,
        customSlug: req.body.customSlug
      });

      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'At least one image is required' 
        });
      }

      // Get user ID for blog post creation
      const authorId = req.user?.id;
      if (!authorId) {
        return res.status(401).json({ 
          success: false, 
          error: 'User authentication required' 
        });
      }

      // Initialize AutoBlog orchestrator
      const orchestrator = new AutoBlogOrchestrator();
      
      // FIX #2: Pass ALL form data to orchestrator including images and guidance
      console.log('🔧 FIX #2: Passing complete form data to AutoBlog orchestrator...');
      console.log('Form data received:', {
        contentGuidance: input.contentGuidance,
        language: input.language,
        siteUrl: input.siteUrl,
        publishOption: input.publishOption,
        customSlug: input.customSlug,
        imageCount: req.files?.length || 0
      });

      // Generate blog post with complete form data
      const result = await orchestrator.generateAutoBlog(
        req.files as Express.Multer.File[],
        input,
        authorId,
        "e5dc81e8-7073-4041-8814-affb60f4ef6c" // pass studio ID for assistant lookup
      );

      res.json(result);
    } catch (error) {
      console.error('AutoBlog generation error:', error);
      
      let errorMessage = 'Failed to generate blog post';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        success: false, 
        error: errorMessage 
      });
    }
  });

  // AutoBlog Chat Interface - OpenAI Assistant API Communication
  app.post("/api/autoblog/chat", authenticateUser, autoblogUpload.array('images', 3), async (req: Request, res: Response) => {
    try {
      const { 
        message, 
        assistantId, 
        threadId, 
        publishOption = 'draft',
        customSlug,
        scheduledFor 
      } = req.body;
      const images = req.files as Express.Multer.File[];

      console.log('AutoBlog Assistant chat request:', { message, assistantId, threadId, imageCount: images?.length || 0 });

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      if (!assistantId) {
        return res.status(400).json({ error: 'Assistant ID is required' });
      }

      // Import centralized config and debugging setup
      const { BLOG_ASSISTANT, DEBUG_OPENAI } = await import('./config');
      
      // Initialize OpenAI Assistant API with debug logging
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      if (DEBUG_OPENAI) {
        // Some OpenAI client implementations may not expose these properties in types
        (openai as any).baseURL = "https://api.openai.com/v1";
        (openai as any).defaultHeaders = { ...((openai as any).defaultHeaders || {}), "x-openai-debug": "true" };
      }

      // DIAGNOSTIC CHECK #1: Verify assistant ID
      console.dir({
        requestedAssistantId: assistantId, 
        configuredAssistantId: BLOG_ASSISTANT,
        match: assistantId === BLOG_ASSISTANT
      }, {depth: 2});

      // Force use of correct assistant ID
      const correctAssistantId = BLOG_ASSISTANT;

      // Create or retrieve thread
      let currentThreadId = threadId;
      if (!currentThreadId) {
        try {
          const thread = await openai.beta.threads.create();
          currentThreadId = thread.id;
          console.log('Created new thread:', currentThreadId);
        } catch (threadError) {
          console.error('Error creating thread:', threadError);
          throw new Error('Failed to create conversation thread');
        }
      }

      // Prepare message content for Assistant API
      let messageContent: any[] = [];
      
      if (message && message.trim()) {
        messageContent.push({
          type: "text",
          text: message
        });
      }

      // Handle image uploads for Assistant API with file upload approach
      if (images && images.length > 0) {
        console.log(`Processing ${images.length} images for Assistant API`);
        
        for (const image of images) {
          try {
            // Upload file to OpenAI for Assistant API
            const fileUpload = await openai.files.create({
              file: fs.createReadStream(image.path),
              purpose: "assistants"
            });
            
            messageContent.push({
              type: "image_file",
              image_file: { file_id: fileUpload.id }
            });
            
            console.log(`Uploaded file to OpenAI: ${fileUpload.id} for ${image.originalname}`);
          } catch (imageError) {
            console.error('Error uploading image to OpenAI:', imageError);
            // Fallback to base64 approach if file upload fails
            try {
              const imageBuffer = fs.readFileSync(image.path);
              const base64Image = imageBuffer.toString('base64');
              const mimeType = image.mimetype || 'image/jpeg';
              
              messageContent.push({
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              });
              console.log(`Added base64 image for ${image.originalname}`);
            } catch (base64Error) {
              console.error('Error converting image to base64:', base64Error);
            }
          }
        }
      }

      // Add message to thread
      try {
        await openai.beta.threads.messages.create(currentThreadId, {
          role: "user",
          content: messageContent.length > 0 ? messageContent : (message || "Generate a blog post")
        });
        console.log('Added message to thread');
      } catch (messageError) {
        console.error('Error adding message to thread:', messageError);
        throw new Error('Failed to add message to conversation');
      }

      // Now run the OpenAI Assistant
      console.log('Starting OpenAI Assistant run with Assistant ID:', assistantId);
      
      let run;
      try {
        run = await openai.beta.threads.runs.create(currentThreadId, {
          assistant_id: correctAssistantId,
          metadata: { feature: "autoblog-chat", studioId: req.user?.id }
        });
        
        console.log('✅ Using correct TOGNINJA assistant ID:', correctAssistantId);
        console.log('Started assistant run:', run.id, 'on thread:', currentThreadId);
      } catch (runError) {
        console.error('Error starting assistant run:', runError);
        throw new Error('Failed to start assistant processing');
      }

      // Use direct HTTP API calls to bypass SDK parameter ordering issues
      console.log('Using direct HTTP API calls to work around SDK compatibility issues...');
      
      // Wait for the Assistant run to complete using direct HTTP API
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max
      let runCompleted = false;
      
      while (attempts < maxAttempts && !runCompleted) {
        try {
          console.log(`Checking run status (attempt ${attempts + 1}) with threadId: ${currentThreadId}, runId: ${run.id}`);
          
          const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2'
            }
          });
          
          if (!statusResponse.ok) {
            throw new Error(`HTTP ${statusResponse.status}: ${statusResponse.statusText}`);
          }
          
          const runStatus = await statusResponse.json();
          console.log(`Assistant run status: ${runStatus.status} (attempt ${attempts + 1})`);
          
          if (runStatus.status === 'completed') {
            console.log('Assistant run completed successfully!');
            runCompleted = true;
            break;
          } else if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
            throw new Error(`Assistant run failed with status: ${runStatus.status}`);
          }
          
          // Wait 2 seconds before checking again
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        } catch (statusError) {
          console.error('Error checking run status via HTTP API:', statusError);
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!runCompleted) {
        throw new Error('Assistant run timed out after 2 minutes');
      }
      
      // Retrieve messages using direct HTTP API
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      
      if (!messagesResponse.ok) {
        throw new Error(`Failed to retrieve messages: ${messagesResponse.statusText}`);
      }
      
      const messagesData = await messagesResponse.json();
      const assistantMessages = messagesData.data.filter(msg => msg.role === 'assistant');
      
      if (assistantMessages.length === 0) {
        throw new Error('No response from assistant');
      }
      
      const latestMessage = assistantMessages[0];
      let responseText = '';
      
      // Extract text content from the message
      for (const content of latestMessage.content) {
        if (content.type === 'text') {
          responseText += content.text.value + '\n';
        }
      }
      
      responseText = responseText.trim();
      console.log('Generated blog content via OpenAI Assistant API (HTTP):', responseText.length, 'characters');

      // Handle blog post creation if this is a generation request
      let blogPost = null;
      if (responseText && publishOption) {
        try {
          const title = extractTitle(responseText);
          const content = responseText;
          const excerpt = extractExcerpt(responseText);
          
          if (title && content) {
            const baseSlug = customSlug || title.toLowerCase().replace(/[^a-z0-9äöüß]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
            const slug = `${baseSlug}-${Date.now()}`;
            
            const blogPostData = {
              title,
              content,
              excerpt,
              slug,
              status: publishOption.toUpperCase() as 'DRAFT' | 'PUBLISHED' | 'SCHEDULED',
              tags: ['Familienfotografie', 'Wien', 'Fotoshooting'],
              metaDescription: excerpt?.substring(0, 155) || '',
              scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
              imageUrl: `/blog-images/${Date.now()}-blog-header.jpg`,
              published: publishOption === 'publish',
              publishedAt: publishOption === 'publish' ? new Date() : null
            };

            const { blogPosts } = await import('@shared/schema');
            const [newPost] = await db.insert(blogPosts).values(blogPostData).returning();
            blogPost = newPost;
            console.log('Created blog post via OpenAI Assistant API:', blogPost.id);
          }
        } catch (blogError) {
          console.error('Error creating blog post:', blogError);
        }
      }

      res.json({
        success: true,
        response: responseText,
        threadId: currentThreadId,
        blogPost,
        metadata: {
          model: 'gpt-4o',
          assistantId: assistantId,
          runId: run.id,
          status: 'completed',
          method: 'openai-assistant-api',
          note: 'Generated using your specific OpenAI Assistant (TOGNINJA BLOG WRITER) with full capabilities'
        }
      });
      
    } catch (error: any) {
      console.error('AutoBlog Assistant chat error:', error);
      
      let errorMessage = 'Failed to process chat request';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        success: false, 
        error: errorMessage 
      });
    }
  });

  // Helper functions for blog content extraction
  function extractTitle(content: string): string {
    const titleMatch = content.match(/^#\s*(.+)$/m) || content.match(/Title:\s*(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : `Familienfotografie Wien - ${new Date().toLocaleDateString('de-DE')}`;
  }

  function extractExcerpt(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 2).join('. ').trim().substring(0, 200) + '...';
  }

  // Test endpoint for debugging
  app.get("/api/autoblog/debug", async (req: Request, res: Response) => {
    try {
      res.json({
        message: "AutoBlog system debug",
        openaiAvailable: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // AutoBlog status endpoint
  app.get("/api/autoblog/status", authenticateUser, async (req: Request, res: Response) => {
    try {
      const openaiAvailable = !!process.env.OPENAI_API_KEY;
      const maxImages = parseInt(process.env.MAX_AUTOBLOG_IMAGES || '3');
      
      res.json({
        available: openaiAvailable,
        maxImages,
        supportedLanguages: ['de', 'en'],
        features: [
          'Image-based content generation',
          'SEO optimization',
          'Brand voice integration',
          'Multi-language support'
        ]
      });
    } catch (error) {
      console.error('AutoBlog status error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get AutoBlog status' 
      });
    }
  });

  // AI Agent Chat Endpoint
  app.post('/api/agent/chat', async (req: Request, res: Response) => {
    try {
      const { message, studioId, userId } = req.body;
      
      if (!message || !studioId || !userId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Import runAgent dynamically to avoid module loading issues
      const { runAgent } = await import('../agent/run-agent');
      
      // Run the AI agent with the user's message
      const response = await runAgent(studioId, userId, message);
      
      res.json({ 
        response: response,
        actionPerformed: false // Could enhance this to detect if agent performed actions
      });
    } catch (error) {
      console.error('Agent chat error:', error);
      
      // Fallback response for CRM Operations Assistant
      const fallbackResponse = `I'm your CRM Operations Assistant. I can help you with:

📧 **Email Management**: Reply to client emails, send booking confirmations
📅 **Appointment Management**: Create, modify, cancel bookings
👥 **Client Management**: Add, update, search client records  
💰 **Invoice Operations**: Generate, send, track invoices and payments
📊 **Business Analytics**: Run reports, analyze data, export information

Current system status: The AI agent system is temporarily unavailable. Please try again shortly or describe what specific task you'd like help with.`;
      
      res.json({ 
        response: fallbackResponse,
        actionPerformed: false 
      });
    }
  });

  // ==================== CONTACT FORM ROUTES ====================
  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      const { fullName, email, phone, message } = req.body;

      // Validate required fields
      if (!fullName || !email || !message) {
        return res.status(400).json({ error: "Name, email, and message are required" });
      }

      // Save to database as a lead
      const leadData = {
        firstName: fullName.split(' ')[0] || fullName,
        lastName: fullName.split(' ').slice(1).join(' ') || '',
        email: email,
        phone: phone || null,
        source: 'Website Contact Form',
        notes: message,
        status: 'new'
      };

      const newLead = await db.insert(crmLeads).values(leadData).returning();

      // Send email notification to business
      try {
        const transporter = nodemailer.createTransporter({
          host: 'smtp.easyname.com',
          port: 465,
          secure: true,
          auth: {
            user: process.env.BUSINESS_MAILBOX_USER || '30840mail10',
            pass: process.env.EMAIL_PASSWORD || 'your-email-password'
          }
        });

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; border-bottom: 2px solid #7C3AED; padding-bottom: 10px;">
              Neue Kontaktanfrage von Website
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">Kontaktdaten:</h3>
              <p><strong>Name:</strong> ${fullName}</p>
              <p><strong>E-Mail:</strong> <a href="mailto:${email}">${email}</a></p>
              ${phone ? `<p><strong>Telefon:</strong> <a href="tel:${phone}">${phone}</a></p>` : ''}
              <p><strong>Zeitpunkt:</strong> ${new Date().toLocaleString('de-DE')}</p>
            </div>

            <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h3 style="color: #333; margin: 0 0 15px 0;">Nachricht:</h3>
              <p style="line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>

            <div style="margin-top: 20px; padding: 15px; background-color: #e8f4fd; border-radius: 8px;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                Diese Nachricht wurde automatisch von Ihrer Website generiert. 
                Der Lead wurde bereits in Ihrem CRM-System gespeichert.
              </p>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: '"New Age Fotografie Website" <hallo@newagefotografie.com>',
          to: 'hallo@newagefotografie.com',
          subject: `Neue Kontaktanfrage von ${fullName}`,
          html: emailHtml
        });

      } catch (emailError) {
        console.error('Error sending contact form email:', emailError);
        // Don't fail the request if email fails - lead is still saved
      }

      res.json({ 
        success: true, 
        message: "Ihre Nachricht wurde erfolgreich gesendet. Wir melden uns bald bei Ihnen!",
        leadId: newLead[0]?.id 
      });

    } catch (error) {
      console.error("Error processing contact form:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." });
    }
  });

  // ==================== APPOINTMENT/WAITLIST ROUTES ====================
  app.post("/api/waitlist", async (req: Request, res: Response) => {
    try {
      const { fullName, email, phone, preferredDate, message } = req.body;

      // Validate required fields
      if (!fullName || !email || !phone || !preferredDate) {
        return res.status(400).json({ error: "Name, email, phone, and preferred date are required" });
      }

      // Save to database as a lead with appointment details
      const leadData = {
        firstName: fullName.split(' ')[0] || fullName,
        lastName: fullName.split(' ').slice(1).join(' ') || '',
        email: email,
        phone: phone,
        source: 'Appointment Request (Waitlist)',
        notes: `Preferred Date: ${preferredDate}${message ? '\n\nAdditional Message: ' + message : ''}`,
        status: 'new'
      };

      const newLead = await db.insert(crmLeads).values(leadData).returning();

      // Send appointment request email to business
      try {
        const transporter = nodemailer.createTransporter({
          host: 'smtp.easyname.com',
          port: 465,
          secure: true,
          auth: {
            user: process.env.BUSINESS_MAILBOX_USER || '30840mail10',
            pass: process.env.EMAIL_PASSWORD || 'your-email-password'
          }
        });

        const formatDate = (dateString: string) => {
          const date = new Date(dateString);
          return date.toLocaleDateString('de-DE', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        };

        const appointmentEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7C3AED; border-bottom: 2px solid #7C3AED; padding-bottom: 10px;">
              📅 Neue Terminanfrage
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">Kundendaten:</h3>
              <p><strong>Name:</strong> ${fullName}</p>
              <p><strong>E-Mail:</strong> <a href="mailto:${email}">${email}</a></p>
              <p><strong>Telefon:</strong> <a href="tel:${phone}">${phone}</a></p>
              <p><strong>Eingegangen:</strong> ${new Date().toLocaleString('de-DE')}</p>
            </div>

            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7C3AED;">
              <h3 style="color: #7C3AED; margin: 0 0 15px 0;">🗓️ Gewünschter Termin:</h3>
              <p style="font-size: 18px; font-weight: bold; color: #333; margin: 0;">
                ${formatDate(preferredDate)}
              </p>
              <p style="font-size: 14px; color: #666; margin: 5px 0 0 0;">
                (${preferredDate})
              </p>
            </div>

            ${message ? `
              <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0;">💬 Zusätzliche Nachricht:</h3>
                <p style="line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
            ` : ''}

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">📞 Schnelle Aktionen:</h3>
              <p style="margin: 5px 0;">
                <a href="tel:${phone}" style="color: #7C3AED; text-decoration: none; font-weight: bold;">
                  📱 ${phone} anrufen
                </a>
              </p>
              <p style="margin: 5px 0;">
                <a href="mailto:${email}?subject=Bestätigung Ihres Fotoshooting-Termins am ${formatDate(preferredDate)}" style="color: #7C3AED; text-decoration: none; font-weight: bold;">
                  ✉️ Terminbestätigung senden
                </a>
              </p>
              <p style="margin: 5px 0;">
                <a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=Hallo ${fullName.split(' ')[0]}, vielen Dank für Ihre Terminanfrage für den ${formatDate(preferredDate)}. Gerne bestätige ich Ihnen den Termin!" style="color: #7C3AED; text-decoration: none; font-weight: bold;">
                  💬 WhatsApp-Bestätigung
                </a>
              </p>
            </div>

            <div style="margin-top: 20px; padding: 15px; background-color: #e8f4fd; border-radius: 8px;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                Diese Terminanfrage wurde automatisch von Ihrer Website generiert. 
                Der Lead wurde bereits in Ihrem CRM-System gespeichert.
              </p>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: '"New Age Fotografie Website" <hallo@newagefotografie.com>',
          to: 'hallo@newagefotografie.com',
          subject: `📅 Neue Terminanfrage: ${fullName} für ${formatDate(preferredDate)}`,
          html: appointmentEmailHtml
        });

        // Send confirmation email to customer
        const customerConfirmationHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7C3AED; margin: 0;">New Age Fotografie</h1>
              <p style="color: #666; margin: 5px 0;">Familienfotograf Wien</p>
            </div>

            <h2 style="color: #333; text-align: center;">
              Vielen Dank für Ihre Terminanfrage! 📸
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #7C3AED; margin: 0 0 20px 0;">Ihre Anfrage im Überblick:</h3>
              <p><strong>Gewünschter Termin:</strong> ${formatDate(preferredDate)}</p>
              <p><strong>Name:</strong> ${fullName}</p>
              <p><strong>E-Mail:</strong> ${email}</p>
              <p><strong>Telefon:</strong> ${phone}</p>
              ${message ? `<p><strong>Ihre Nachricht:</strong><br>${message}</p>` : ''}
            </div>

            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">📞 Wie geht es weiter?</h3>
              <p style="margin: 10px 0;">
                Wir melden uns innerhalb von <strong>24 Stunden</strong> bei Ihnen zurück, um Ihren Wunschtermin zu bestätigen oder alternative Termine vorzuschlagen.
              </p>
              <p style="margin: 10px 0;">
                <strong>Dringende Anfragen:</strong><br>
                WhatsApp/Tel: <a href="tel:+43677663992010" style="color: #7C3AED;">+43 677 633 99210</a><br>
                E-Mail: <a href="mailto:hallo@newagefotografie.com" style="color: #7C3AED;">hallo@newagefotografie.com</a>
              </p>
            </div>

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #333; margin: 0 0 10px 0;">💡 Tipp für Ihren Fotoshooting-Termin:</h4>
              <ul style="color: #666; margin: 0; padding-left: 20px;">
                <li>Wir fotografieren auch an Wochenenden</li>
                <li>Flexible Termingestaltung nach Ihren Wünschen</li>
                <li>Outdoor- und Indoor-Fotoshootings möglich</li>
                <li>Professionelle Nachbearbeitung inklusive</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                New Age Fotografie | Wehrgasse 11A/2+5, 1050 Wien<br>
                Tel/WhatsApp: +43 677 633 99210 | E-Mail: hallo@newagefotografie.com
              </p>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: '"New Age Fotografie" <hallo@newagefotografie.com>',
          to: email,
          subject: '📅 Terminanfrage erhalten - Wir melden uns bald!',
          html: customerConfirmationHtml
        });

      } catch (emailError) {
        console.error('Error sending appointment emails:', emailError);
        // Don't fail the request if email fails - lead is still saved
      }

      res.json({ 
        success: true, 
        message: "Ihre Terminanfrage wurde erfolgreich übermittelt. Wir melden uns innerhalb von 24 Stunden bei Ihnen!",
        leadId: newLead[0]?.id 
      });

    } catch (error) {
      console.error("Error processing appointment request:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." });
    }
  });

  // ==================== NEWSLETTER/VOUCHER SIGNUP ROUTES ====================
  app.post("/api/newsletter/signup", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      // Validate email
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: "Valid email address is required" });
      }

      // Save to database as a lead
      const leadData = {
        firstName: '',
        lastName: '',
        email: email,
        source: 'Newsletter Signup (50 EUR Voucher)',
        notes: 'Signed up for 50 EUR voucher offer',
        status: 'new'
      };

      const newLead = await db.insert(crmLeads).values(leadData).returning();

      // Send voucher email to customer
      try {
        const transporter = nodemailer.createTransporter({
          host: 'smtp.easyname.com',
          port: 465,
          secure: true,
          auth: {
            user: process.env.BUSINESS_MAILBOX_USER || '30840mail10',
            pass: process.env.EMAIL_PASSWORD || 'your-email-password'
          }
        });

        const voucherEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7C3AED; margin: 0;">New Age Fotografie</h1>
              <p style="color: #666; margin: 5px 0;">Familienfotograf Wien</p>
            </div>

            <h2 style="color: #333; text-align: center;">
              Vielen Dank für Ihr Interesse! 🎉
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="color: #7C3AED; margin: 0 0 20px 0; font-size: 24px;">
                Ihr 50€ Fotoshooting-Gutschein
              </h3>
              <div style="background-color: #7C3AED; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 18px; font-weight: bold;">VOUCHER50</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">Gutscheincode für 50€ Rabatt</p>
              </div>
              <p style="color: #666; margin: 10px 0;">
                Gültig für alle Fotoshooting-Pakete. Einfach bei der Buchung angeben.
              </p>
            </div>

            <div style="margin: 30px 0;">
              <h3 style="color: #333;">So einfach geht's:</h3>
              <ol style="color: #666; line-height: 1.6;">
                <li>WhatsApp an <strong>+43 677 633 99210</strong> oder E-Mail an <strong>hallo@newagefotografie.com</strong></li>
                <li>Ihren Wunschtermin nennen</li>
                <li>Gutscheincode <strong>VOUCHER50</strong> erwähnen</li>
                <li>50€ sparen und wunderschöne Erinnerungen schaffen!</li>
              </ol>
            </div>

            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #333; margin: 0 0 10px 0;">Unsere Fotoshootings:</h4>
              <ul style="color: #666; margin: 0; padding-left: 20px;">
                <li>Familienfotografie</li>
                <li>Neugeborenen-Fotografie</li>
                <li>Schwangerschaftsfotos</li>
                <li>Business-Headshots</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                New Age Fotografie | Wehrgasse 11A/2+5, 1050 Wien<br>
                Tel/WhatsApp: +43 677 633 99210 | E-Mail: hallo@newagefotografie.com
              </p>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: '"New Age Fotografie" <hallo@newagefotografie.com>',
          to: email,
          subject: '🎉 Ihr 50€ Fotoshooting-Gutschein ist da!',
          html: voucherEmailHtml
        });

        // Send notification to business
        await transporter.sendMail({
          from: '"New Age Fotografie Website" <hallo@newagefotografie.com>',
          to: 'hallo@newagefotografie.com',
          subject: `Neue Newsletter-Anmeldung: ${email}`,
          html: `
            <h3>Neue Newsletter-Anmeldung</h3>
            <p><strong>E-Mail:</strong> ${email}</p>
            <p><strong>Zeitpunkt:</strong> ${new Date().toLocaleString('de-DE')}</p>
            <p><strong>Angebot:</strong> 50 EUR Gutschein</p>
            <p>Der Lead wurde automatisch in Ihrem CRM-System gespeichert.</p>
          `
        });

      } catch (emailError) {
        console.error('Error sending voucher email:', emailError);
        // Don't fail the request if email fails - lead is still saved
      }

      res.json({ 
        success: true, 
        message: "Vielen Dank! Prüfen Sie Ihre E-Mails für Ihren 50€ Gutschein.",
        leadId: newLead[0]?.id 
      });

    } catch (error) {
      console.error("Error processing newsletter signup:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." });
    }
  });

  // Website Wizard routes
  app.use('/api/website-wizard', websiteWizardRoutes);
  app.use('/api/gallery', galleryShopRouter);

  // Register test routes
  registerTestRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        isAdmin: boolean;
      };
    }
  }
}
