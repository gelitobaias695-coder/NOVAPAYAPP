import pool from '../db/pool.js';

export const getPixelSettings = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pixel_settings WHERE id = 1 LIMIT 1');
        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('Error getting pixel settings:', err);
        res.status(500).json({ error: 'Erro ao buscar configurações do Meta Pixel' });
    }
};

export const updatePixelSettings = async (req, res) => {
    try {
        const { pixel_id, access_token, server_side } = req.body;

        await pool.query(`
            UPDATE pixel_settings 
            SET pixel_id = $1, access_token = $2, server_side = $3, updated_at = NOW()
            WHERE id = 1
        `, [
            pixel_id !== undefined ? pixel_id : '',
            access_token !== undefined ? access_token : '',
            server_side !== undefined ? server_side : true
        ]);

        res.json({ message: 'Configurações de Pixel atualizadas com sucesso!' });
    } catch (err) {
        console.error('Error updating pixel settings:', err);
        res.status(500).json({ error: 'Erro ao salvar configurações do Meta Pixel' });
    }
};
