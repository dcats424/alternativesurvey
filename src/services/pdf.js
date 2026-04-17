const PDFDocument = require('pdfkit');

function generateDoctorReportPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40, 
        size: 'A4'
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { doctor_name, doctor_id, average_rating, total_patients, date_from, date_to, question_ratings } = data;
      const rating = Number(average_rating) || 0;
      const total = Number(total_patients) || 0;
      
      const formatDate = (dateStr) => {
        if (!dateStr) return 'All Time';
        const [y, m, d] = dateStr.split('-');
        return d + '/' + m + '/' + y;
      };

      const pageW = 595;
      const leftM = 40;
      const rightM = 40;
      const contentW = pageW - leftM - rightM;

      // ========== HEADER ==========
      doc.rect(0, 0, pageW, 80).fill('#2563eb');
      
      doc.fillColor('white')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('PATIENT FEEDBACK REPORT', 0, 15, { align: 'center', width: pageW });
      
      doc.fontSize(11)
         .font('Helvetica')
         .text('Confidential - For Doctor\'s Review', 0, 42, { align: 'center', width: pageW });
      
      doc.fontSize(10)
         .text('Report Period: ' + formatDate(date_from) + ' - ' + formatDate(date_to), 0, 58, { align: 'center', width: pageW });

      let y = 95;

      // ========== DOCTOR INFO ==========
      doc.fillColor('#111827')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text(doctor_name, leftM, y);
      
      y += 26;
      
      doc.fillColor('#6b7280')
         .fontSize(10)
         .font('Helvetica')
         .text('Doctor ID: ' + doctor_id + '  |  Department: General', leftM, y);
      
      y += 25;

      // ========== LETTER ==========
      doc.fillColor('#374151')
         .fontSize(11)
         .font('Helvetica')
         .text('Dear ' + doctor_name + ',', leftM, y);
      
      y += 18;
      
      doc.text('We are pleased to present your patient feedback report for the period of ' + formatDate(date_from) + ' to ' + formatDate(date_to) + '. This report summarizes the feedback collected from ' + total + ' patient' + (total !== 1 ? 's' : '') + ' who completed our patient satisfaction survey during their visit.', leftM, y, { width: contentW, lineGap: 3 });
      
      y += 40;

      // ========== OVERALL RATING ==========
      doc.fillColor('#111827')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('OVERALL RATING', leftM, y);
      
      y += 20;

      // Rating box
      doc.rect(leftM, y, contentW, 65).fill('#f9fafb').stroke('#e5e7eb');

      // Big rating
      doc.fillColor('#111827')
         .fontSize(48)
         .font('Helvetica-Bold')
         .text(rating.toFixed(1), leftM + 15, y + 5);
      
      doc.fillColor('#9ca3af')
         .fontSize(18)
         .text('/ 5.0', leftM + 90, y + 22);

      doc.fillColor('#6b7280')
         .fontSize(10)
         .font('Helvetica')
         .text('Based on ' + total + ' patient' + (total !== 1 ? 's' : '') + '', leftM + 15, y + 42);

      // Status
      let statusText = 'Average';
      let statusColor = '#d97706';
      if (rating >= 4.5) { statusText = 'Excellent'; statusColor = '#059669'; }
      else if (rating >= 4.0) { statusText = 'Very Good'; statusColor = '#059669'; }
      else if (rating >= 3.5) { statusText = 'Good'; statusColor = '#2563eb'; }
      else if (rating >= 3.0) { statusText = 'Average'; statusColor = '#d97706'; }
      else if (rating >= 2.0) { statusText = 'Below Average'; statusColor = '#ea580c'; }
      else { statusText = 'Poor'; statusColor = '#dc2626'; }

      doc.fillColor(statusColor)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text(statusText, leftM + 350, y + 8);
      
      doc.fillColor('#6b7280')
         .fontSize(9)
         .font('Helvetica')
         .text(rating >= 4.0 ? 'Outstanding performance' : rating >= 3.5 ? 'Good performance' : 'Needs improvement', leftM + 350, y + 28);

      y += 75;

      // ========== RATING SCALE ==========
      doc.fillColor('#eff6ff')
         .rect(leftM, y, contentW, 25)
         .fill()
         .stroke('#bfdbfe');
      
      doc.fillColor('#374151')
         .fontSize(9)
         .font('Helvetica')
         .text('Rating Scale:   5 = Excellent   |   4 = Very Good   |   3 = Average   |   2 = Not Good   |   1 = Very Bad', leftM + 8, y + 7);
      
      y += 35;

      // ========== STARS ==========
      doc.fillColor('#111827')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('STAR RATING DISTRIBUTION', leftM, y);
      
      y += 20;

      // Stars breakdown
      const fiveStar = data.five_star || 0;
      const fourStar = data.four_star || 0;
      const threeStar = data.three_star || 0;
      const twoStar = data.two_star || 0;
      const oneStar = data.one_star || 0;
      
      const starData = [
        { stars: '★★★★★', label: '5 Stars', count: fiveStar, color: '#059669' },
        { stars: '★★★★', label: '4 Stars', count: fourStar, color: '#059669' },
        { stars: '★★★', label: '3 Stars', count: threeStar, color: '#d97706' },
        { stars: '★★', label: '2 Stars', count: twoStar, color: '#ea580c' },
        { stars: '★', label: '1 Star', count: oneStar, color: '#dc2626' }
      ];

      for (const star of starData) {
        doc.fillColor('#374151')
           .fontSize(12)
           .font('Helvetica')
           .text(star.stars, leftM, y);
        
        doc.fillColor('#6b7280')
           .fontSize(9)
           .text(star.label + ': ' + star.count + ' patient(s)', leftM + 100, y + 2);
        
        y += 18;
      }

      y += 10;

      // ========== CATEGORIES ==========
      doc.fillColor('#111827')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('DETAILED RATINGS BY CATEGORY', leftM, y);
      
      y += 20;

      if (question_ratings && question_ratings.length > 0) {
        for (const qr of question_ratings) {
          const qrAvg = Number(qr.average) || 0;
          const qrCount = Number(qr.count) || 0;

          // Category box
          doc.rect(leftM, y, contentW, 60)
             .fill('#f9fafb')
             .stroke('#e5e7eb');

          // Name
          doc.fillColor('#111827')
             .fontSize(12)
             .font('Helvetica-Bold')
             .text(qr.question_key || 'Rating', leftM + 10, y + 8);
          
          // Type indicator
          if (qr.type === 'yes_no') {
            doc.fillColor('#6b7280')
               .fontSize(9)
               .font('Helvetica')
               .text('(Yes/No Question)', leftM + 10, y + 26);
          }
          
          // Count
          doc.fillColor('#6b7280')
             .fontSize(9)
             .font('Helvetica')
             .text(qrCount + ' patient(s) rated this aspect', leftM + 10, qr.type === 'yes_no' ? y + 42 : y + 26);
          
          // Rating or Yes/No
          if (qr.type === 'yes_no') {
            const yesCount = qr.yes_count || 0;
            const noCount = qr.no_count || 0;
            
            doc.fillColor('#059669')
               .fontSize(14)
               .font('Helvetica-Bold')
               .text('Yes: ' + yesCount, leftM + 350, y + 12);
            
            doc.fillColor('#dc2626')
               .fontSize(14)
               .font('Helvetica-Bold')
               .text('No: ' + noCount, leftM + 440, y + 12);
          } else {
            doc.fillColor('#111827')
               .fontSize(28)
               .font('Helvetica-Bold')
               .text(qrAvg.toFixed(1), leftM + 400, y + 5);
            
            doc.fillColor('#9ca3af')
               .fontSize(14)
               .text('/ 5.0', leftM + 460, y + 20);
            
            // Progress bar
            const barW = 200;
            const fillW = (qrAvg / 5) * barW;
            
            doc.fillColor('#e5e7eb')
               .rect(leftM + 10, y + 45, barW, 6)
               .fill();
            
            let barColor = '#dc2626';
            if (qrAvg >= 4.5) barColor = '#059669';
            else if (qrAvg >= 4.0) barColor = '#059669';
            else if (qrAvg >= 3.5) barColor = '#2563eb';
            else if (qrAvg >= 3.0) barColor = '#d97706';
            
            doc.fillColor(barColor)
               .rect(leftM + 10, y + 45, fillW, 6)
               .fill();
          }

          y += 68;
        }
      }

      y += 15;

      // ========== PERFORMANCE SUMMARY ==========
      doc.fillColor('#eff6ff')
         .rect(leftM, y, contentW, 80)
         .fill()
         .stroke('#bfdbfe');
      
      doc.fillColor('#111827')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('PERFORMANCE SUMMARY', leftM + 10, y + 10);
      
      y += 28;

      let summary = '';
      if (rating >= 4.0) {
        summary = 'Outstanding performance! Patients consistently rate you at the highest levels across all aspects of care. Your dedication to patient satisfaction is evident. Continue providing this exceptional level of care.';
      } else if (rating >= 3.5) {
        summary = 'Good performance. Patients appreciate your care and service. While you are performing well, there are specific areas where focused improvement could elevate patient satisfaction even further.';
      } else if (rating >= 3.0) {
        summary = 'Average performance indicates that there is room for improvement. Consider reviewing the detailed feedback below to identify specific areas where you can enhance patient experience.';
      } else {
        summary = 'Below average ratings suggest that improvements are needed. We recommend reviewing the feedback carefully and working with your supervisors to develop an improvement plan.';
      }

      doc.fillColor('#374151')
         .fontSize(10)
         .font('Helvetica')
         .text(summary, leftM + 10, y, { width: contentW - 20, lineGap: 3 });
      
      y += 65;

      // ========== FOOTER ==========
      doc.moveTo(leftM, y).lineTo(pageW - rightM, y).stroke('#e5e7eb');
      
      y += 12;
      
      doc.fillColor('#9ca3af')
         .fontSize(9)
         .font('Helvetica')
         .text('This is an automated report from the Patient Feedback System.', 0, y, { align: 'center', width: pageW });
      
      y += 14;
      
      doc.fillColor('#9ca3af')
         .fontSize(9)
         .font('Helvetica')
         .text('Generated on ' + new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), 0, y, { align: 'center', width: pageW });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { generateDoctorReportPDF };
