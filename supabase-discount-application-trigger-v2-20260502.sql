create or replace function public.apply_discount_code_to_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_amount numeric;
  calculated_base numeric;
  vatax_supply_base numeric;
  vatax_final_amount numeric;
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
    vatax_supply_base = case
      when coalesce(new.business_type, '') like '%일반%' then 100000
      else 80000
    end;

    calculated_base = coalesce(new.base_fee, round(vatax_supply_base * 1.1));
    vatax_final_amount = round(greatest(vatax_supply_base - matched_amount, 0) * 1.1);

    new.base_fee = calculated_base;
    new.final_payment_amount = vatax_final_amount;
    new.total_amount = vatax_final_amount;
    new.supply_amount = vatax_final_amount;
  end if;

  return new;
end;
$$;

drop trigger if exists applications_apply_discount_code on public.applications;
create trigger applications_apply_discount_code
before insert or update of coupon, base_fee, business_type, discount_amount
on public.applications
for each row execute function public.apply_discount_code_to_application();
