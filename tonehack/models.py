from django.db import models
import simplejson as json

class Instrument(models.Model):
    id = models.AutoField(primary_key=True)
    waves_json = models.TextField()
    date = models.DateTimeField()
    owner = models.CharField(max_length=50)

    class Meta:
        db_table = 'messages'
        ordering = ['date']

    def __unicode__(self):
        freqs = [ wave.freq for wave in json.decode(self.waves_json) ]
        return "/".join(freqs)

