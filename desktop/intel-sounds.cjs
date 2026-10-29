const presets=['sonar','double','pulse','low','silent'];
function validate(sound,volume){if(!presets.includes(sound)||!Number.isFinite(volume)||volume<0||volume>1)throw Error('Ungültiger Warnton oder Lautstärke.');return {sound,volume};}
module.exports={presets,validate};
