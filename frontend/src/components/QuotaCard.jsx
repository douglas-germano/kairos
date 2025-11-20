import React, { useEffect, useState } from 'react';
import { authAPI } from '../services/api';

const QuotaCard = () => {
    const [quota, setQuota] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchQuota = async () => {
            try {
                const response = await authAPI.getQuota();
                setQuota(response.data);
            } catch (err) {
                console.error('Error fetching quota:', err);
                setError('Erro ao carregar cotas');
            } finally {
                setLoading(false);
            }
        };

        fetchQuota();
    }, []);

    if (loading) return <div className="p-4 bg-gray-800 rounded-lg animate-pulse h-48"></div>;
    if (error) return <div className="p-4 bg-red-900/20 text-red-400 rounded-lg">{error}</div>;
    if (!quota) return null;

    const { plan, usage, limits } = quota;

    const getPercentage = (current, max) => {
        if (!max || max === 999999) return 0; // Enterprise/Unlimited
        return Math.min(100, (current / max) * 100);
    };

    const metrics = [
        { key: 'api_calls_per_day', label: 'Chamadas API (Dia)' },
    ];

    return (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Uso do Plano</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${plan === 'light' ? 'bg-purple-500/20 text-purple-400' :
                    plan === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-600/20 text-gray-400'
                    }`}>
                    {plan}
                </span>
            </div>

            <div className="space-y-4">
                {metrics.map((metric) => {
                    const current = usage[metric.key] || 0;
                    const max = limits[metric.key] || 0;
                    const percent = getPercentage(current, max);
                    const isUnlimited = max >= 999999;

                    return (
                        <div key={metric.key}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400">{metric.label}</span>
                                <span className="text-gray-300">
                                    {current} / {isUnlimited ? '∞' : max}
                                </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className={`h-2.5 rounded-full transition-all duration-500 ${percent > 90 ? 'bg-red-500' :
                                        percent > 70 ? 'bg-yellow-500' :
                                            'bg-green-500'
                                        }`}
                                    style={{ width: `${isUnlimited ? 100 : percent}%`, opacity: isUnlimited ? 0.3 : 1 }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default QuotaCard;
