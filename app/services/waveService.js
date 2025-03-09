const db = require('../db');

class WaveService {
  async createWave(departmentCode, name, startDate, endDate) {
    // Check if there's already an active wave for this department
    const activeWave = await this.getActiveWave(departmentCode);
    if (activeWave) {
      throw new Error('Department already has an active wave');
    }

    const [wave] = await db('survey_waves')
      .insert({
        department_code: departmentCode,
        name,
        start_date: startDate,
        end_date: endDate,
        status: 'active'
      })
      .returning('*');
    
    return wave;
  }

  async getActiveWave(departmentCode) {
    const wave = await db('survey_waves')
      .where({
        department_code: departmentCode,
        status: 'active'
      })
      .orderBy('created_at', 'desc')
      .first();
    
    return wave;
  }

  async getAllWaves(departmentCode) {
    const waves = await db('survey_waves')
      .where('department_code', departmentCode)
      .orderBy('start_date', 'desc');
    
    return waves;
  }

  async getWaveById(id, departmentCode) {
    const wave = await db('survey_waves')
      .where({
        id,
        department_code: departmentCode
      })
      .first();
    
    return wave;
  }

  async closeWave(id, departmentCode) {
    const [wave] = await db('survey_waves')
      .where({
        id,
        department_code: departmentCode
      })
      .update({
        status: 'closed',
        updated_at: db.fn.now()
      })
      .returning('*');
    
    return wave;
  }

  async getWaveStats(waveId, departmentCode) {
    const stats = await db('survey_responses')
      .where({
        survey_wave_id: waveId,
        department_code: departmentCode
      })
      .whereNotNull('submitted_at')
      .select(
        db.raw('COUNT(*) as total_responses'),
        db.raw('AVG(CAST(overall_score as float)) as average_score')
      )
      .first();
    
    return stats;
  }

  async compareWaves(wave1Id, wave2Id, departmentCode) {
    const [wave1Stats, wave2Stats] = await Promise.all([
      this.getWaveStats(wave1Id, departmentCode),
      this.getWaveStats(wave2Id, departmentCode)
    ]);

    return {
      wave1: wave1Stats,
      wave2: wave2Stats,
      scoreDifference: wave2Stats.average_score - wave1Stats.average_score
    };
  }
}

module.exports = new WaveService(); 