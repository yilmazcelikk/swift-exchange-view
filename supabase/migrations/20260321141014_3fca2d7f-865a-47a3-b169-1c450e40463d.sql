-- Allow admins to delete orders
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete transactions
CREATE POLICY "Admins can delete transactions"
  ON public.transactions FOR DELETE
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));