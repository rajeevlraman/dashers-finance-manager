export function calculateAmortizationSchedule(loan) {
  const { originalAmount, interestRate, termMonths, startDate, paymentFrequency } = loan;
  const monthlyRate = interestRate / 100 / 12;
  const payments = getPaymentsPerYear(paymentFrequency);
  
  const schedule = [];
  let balance = originalAmount;
  let currentDate = new Date(startDate);

  for (let i = 1; i <= termMonths; i++) {
    const interest = balance * monthlyRate;
    const principal = calculatePaymentAmount(loan) - interest;
    
    if (balance <= 0) break;

    schedule.push({
      period: i,
      date: new Date(currentDate),
      payment: calculatePaymentAmount(loan),
      principal: Math.min(principal, balance),
      interest: interest,
      balance: Math.max(0, balance - principal)
    });

    balance -= principal;
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return schedule;
}

export function calculateNextPayment(loan) {
  const schedule = calculateAmortizationSchedule(loan);
  const nextPayment = schedule.find(p => p.balance > 0);
  
  if (!nextPayment) {
    return { amount: 0, dueDate: 'Paid off' };
  }

  return {
    amount: nextPayment.payment,
    dueDate: formatDate(nextPayment.date)
  };
}

export function calculatePaymentAmount(loan) {
  const { originalAmount, interestRate, termMonths } = loan;
  const monthlyRate = interestRate / 100 / 12;
  
  if (monthlyRate === 0) {
    return originalAmount / termMonths;
  }

  return originalAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths) / 
         (Math.pow(1 + monthlyRate, termMonths) - 1);
}

export function calculateTotalInterest(loan) {
  const schedule = calculateAmortizationSchedule(loan);
  return schedule.reduce((total, payment) => total + payment.interest, 0);
}

function getPaymentsPerYear(frequency) {
  const frequencies = {
    weekly: 52,
    fortnightly: 26,
    monthly: 12,
    quarterly: 4
  };
  return frequencies[frequency] || 12;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}