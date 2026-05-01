create or replace function public.apply_discount_code_to_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_amount numeric;
  calculated_base numeric;
begin
  if new.coupon is null or btrim(new.coupon) = '' then
    return new;
  end if;

  select amount
    into matched_amount
  from public.discount_codes
  where lower(code) = lower(btrim(new.coupon))
    and is_active = true
  limit 1;

  if matched_amount is null then
    return new;
  end if;

  new.discount_amount = matched_amount;

  if new.service = 'vatax' then
    calculated_base = coalesce(
      new.base_fee,
      case
        when coalesce(new.business_type, '') like '%일반%' then 110000
        else 88000
      end
    );

    new.base_fee = calculated_base;
    new.final_payment_amount = greatest(calculated_base - matched_amount, 0);
    new.total_amount = greatest(calculated_base - matched_amount, 0);
    new.supply_amount = greatest(calculated_base - matched_amount, 0);
  end if;

  return new;
end;
$$;

drop trigger if exists applications_apply_discount_code on public.applications;
create trigger applications_apply_discount_code
before insert or update of coupon, base_fee, business_type, discount_amount
on public.applications
for each row execute function public.apply_discount_code_to_application();
