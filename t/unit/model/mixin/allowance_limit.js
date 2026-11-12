'use strict';

const expect = require('chai').expect;
const Promise = require('bluebird');
const moment = require('moment');
const absenceAware = require('../../../../lib/model/mixin/user/absence_aware');

describe('leave type limits with individual allowance adjustments', () => {
  function validate({adjustment, used, requested, limit, usesAllowance = true}) {
    const employee = {
      company: {reload_with_bank_holidays: () => Promise.resolve()},
      reload_with_leave_details: () => Promise.resolve(employee),
      reload_with_session_details: () => Promise.resolve(employee),
      promise_allowance: () => Promise.resolve({
        number_of_days_available_in_allowance: 100,
        manual_adjustment: adjustment,
      }),
    };
    absenceAware.call(employee, {});
    employee.calculate_number_of_days_taken_from_allowance = () => used;
    return employee.validate_leave_fits_into_remaining_allowance({
      year: moment.utc('2026-01-01'),
      leave_type: {name: 'Annual Leave', limit, use_allowance: usesAllowance},
      leave: {get_deducted_days_number: () => requested},
    });
  }

  it('allows adjusted days and rejects requests beyond the adjusted limit', async () => {
    await validate({adjustment: 8, used: 20, requested: 8, limit: 20});
    try {
      await validate({adjustment: 8, used: 20, requested: 9, limit: 20});
      throw new Error('Expected the request to be rejected');
    } catch (error) {
      expect(error.message).to.contain('exceed maximum allowed for such type by 1');
    }
  });

  it('applies negative adjustments to allowance-consuming limits', async () => {
    try {
      await validate({adjustment: -3, used: 17, requested: 1, limit: 20});
      throw new Error('Expected the request to be rejected');
    } catch (error) {
      expect(error.message).to.contain('exceed maximum allowed for such type by 1');
    }
  });

  it('preserves limits for leave types that do not use allowance', async () => {
    try {
      await validate({adjustment: 8, used: 20, requested: 1, limit: 20, usesAllowance: false});
      throw new Error('Expected the request to be rejected');
    } catch (error) {
      expect(error.message).to.contain('exceed maximum allowed for such type by 1');
    }
  });

  it('keeps a zero limit unlimited', async () => {
    await validate({adjustment: -3, used: 20, requested: 1, limit: 0});
  });
});
