BEGIN;

UPDATE membership_types
SET price = CASE name
  WHEN 'Пробное занятие' THEN 5.00
  WHEN '5 занятий' THEN 100.00
  WHEN '10 занятий' THEN 190.00
  WHEN '20 занятий' THEN 285.00
  WHEN 'Безлимит на месяц' THEN 350.00
  WHEN 'Персональная тренировка' THEN 45.00
  ELSE price
END
WHERE name IN (
  'Пробное занятие',
  '5 занятий',
  '10 занятий',
  '20 занятий',
  'Безлимит на месяц',
  'Персональная тренировка'
);

UPDATE memberships m
SET price_paid = mt.price
FROM membership_types mt
WHERE mt.id = m.membership_type_id
  AND mt.name IN (
    'Пробное занятие',
    '5 занятий',
    '10 занятий',
    '20 занятий',
    'Безлимит на месяц',
    'Персональная тренировка'
  );

UPDATE payments
SET amount = CASE
  WHEN description LIKE '%«Пробное занятие»%' THEN 5.00
  WHEN description LIKE '%«5 занятий»%' THEN 100.00
  WHEN description LIKE '%«10 занятий»%' THEN 190.00
  WHEN description LIKE '%«20 занятий»%' THEN 285.00
  WHEN description LIKE '%безлимита на месяц%' THEN 350.00
  WHEN description LIKE '%персональной тренировки%' THEN 45.00
  ELSE amount
END
WHERE description LIKE '%«Пробное занятие»%'
   OR description LIKE '%«5 занятий»%'
   OR description LIKE '%«10 занятий»%'
   OR description LIKE '%«20 занятий»%'
   OR description LIKE '%безлимита на месяц%'
   OR description LIKE '%персональной тренировки%';

COMMIT;
